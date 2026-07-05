// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, ebool, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import {ERC165Checker} from "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC7984ERC20Wrapper} from "@openzeppelin/confidential-contracts/interfaces/IERC7984ERC20Wrapper.sol";
import {IERC7984Receiver} from "@openzeppelin/confidential-contracts/interfaces/IERC7984Receiver.sol";
import {FHESafeMath} from "@openzeppelin/confidential-contracts/utils/FHESafeMath.sol";

/// MockYieldVault surface GhostGate needs: the ERC-4626 route + the pinned share-price oracle.
interface IYieldVault is IERC4626 {
    function sharePrice6() external view returns (uint256);
}

/// @title GhostGate — confidential netting gateway (CP4, ruling #2: STANDALONE, reusing the audited
///        `BatcherConfidential` idioms). Within a `minBatchAge` window it accumulates two encrypted
///        aggregates — `D` (cUSDC deposit intents) and `W` (cSHARE withdrawal intents) — and at dispatch
///        reveals ONLY `dir` and `net`; the matched portion settles internally at a rate PINNED at window
///        open, so only the NET flow ever crosses the confidential/plaintext boundary.
/// @dev Idiom reuse (attribution to OpenZeppelin/openzeppelin-confidential-contracts@0.5.1
///      finance/BatcherConfidential.sol): deposit intake via IERC7984Receiver.onConfidentialTransferReceived
///      (L282); status-enum replay guards + fixed-order storage-rebuilt handle lists for finalize (mirrors
///      _validateStateBitmap L442 + the epoch-machine discipline); pro-rata round-down claim math (L367);
///      ERC165 wrapper checks (constructor L119); cancel/full-refund path (quit L157).
/// @dev REVEAL SURFACE (ruling #2, mandatory): the ONLY handles ever passed to `makePubliclyDecryptable`
///      are `dir` and `net`. Enforced by construction here and asserted by the reveal-surface test.
contract GhostGate is ReentrancyGuardTransient, IERC7984Receiver, ZamaEthereumConfig {
    IERC7984ERC20Wrapper public immutable cUSDC; // deposit-side token
    IERC7984ERC20Wrapper public immutable cSHARE; // withdrawal-side token
    address public immutable vault;
    uint40 public immutable minBatchAge;

    enum Status {
        None,
        Pending,
        Dispatched, // dir+net revealed, awaiting finalizeGate
        Routing, // net>0: net-leg unwrap in flight, awaiting routeGate
        Finalized,
        Canceled
    }

    struct Window {
        uint64 pinRate6; // MockYieldVault.sharePrice6() captured at window OPEN (ruling #1)
        uint40 openedAt;
        Status status;
        euint64 D; // cUSDC deposit intents (allowThis-only)
        euint64 W; // cSHARE withdrawal intents (allowThis-only)
        ebool dir; // D >= Wv ? — the ONLY ebool ever made publicly decryptable
        euint64 net; // |D - Wv| — the ONLY euint64 ever made publicly decryptable
        bool dirClear; // deposits win (D >= Wv)
        uint64 netClear; // revealed net (cUSDC units)
        bytes32 unwrapReqId; // net-leg unwrap request (0 until Routing)
    }

    uint256 public currentWindow;
    mapping(uint256 => Window) internal windows;
    mapping(uint256 => mapping(address => euint64)) internal depositIntent;
    mapping(uint256 => mapping(address => euint64)) internal withdrawIntent;

    event BatchWindowOpened(uint256 indexed window, uint40 dispatchableAt);
    event JoinedDeposit(uint256 indexed window, address indexed account, euint64 amount);
    event JoinedWithdraw(uint256 indexed window, address indexed account, euint64 amount);
    event Dispatched(uint256 indexed window, bytes32 dir, bytes32 net);
    event RouteInitiated(uint256 indexed window, bool depositWins, uint64 unwrapAmount);
    event Finalized(uint256 indexed window, uint64 net);
    event Canceled(uint256 indexed window, uint64 realizedRate, uint64 pinRate);
    event Claimed(uint256 indexed window, address indexed account, euint64 amount);

    error Unauthorized();
    error InvalidWrapperToken(address token);
    error BadState(uint256 window, Status current);
    error WindowStillOpen(uint256 window, uint40 dispatchableAt);

    constructor(IERC7984ERC20Wrapper cUSDC_, IERC7984ERC20Wrapper cSHARE_, address vault_, uint40 minBatchAge_) {
        require(
            ERC165Checker.supportsInterface(address(cUSDC_), type(IERC7984ERC20Wrapper).interfaceId),
            InvalidWrapperToken(address(cUSDC_))
        );
        require(
            ERC165Checker.supportsInterface(address(cSHARE_), type(IERC7984ERC20Wrapper).interfaceId),
            InvalidWrapperToken(address(cSHARE_))
        );
        cUSDC = cUSDC_;
        cSHARE = cSHARE_;
        vault = vault_;
        minBatchAge = minBatchAge_;

        // Net-leg route approvals (the gate unwraps → routes through the vault → re-wraps):
        //   deposit-win: vault pulls USDC on deposit; cSHARE pulls vault shares on wrap.
        //   withdraw-win: cUSDC pulls USDC on wrap (redeem sends USDC straight to the gate).
        SafeERC20.forceApprove(IERC20(cUSDC_.underlying()), vault_, type(uint256).max); // vault ← USDC
        SafeERC20.forceApprove(IERC20(cSHARE_.underlying()), address(cSHARE_), type(uint256).max); // cSHARE ← shares
        SafeERC20.forceApprove(IERC20(cUSDC_.underlying()), address(cUSDC_), type(uint256).max); // cUSDC ← USDC

        currentWindow = 1;
        windows[1].openedAt = uint40(block.timestamp);
        windows[1].pinRate6 = uint64(IYieldVault(vault_).sharePrice6());
        windows[1].status = Status.Pending;
        emit BatchWindowOpened(1, uint40(block.timestamp) + minBatchAge_);
    }

    function _mulDivScalar(euint64 x, uint256 num, uint256 den) private returns (euint64) {
        return FHE.div(FHE.mul(x, uint64(num)), uint64(den));
    }

    // ---- intake (attribution: BatcherConfidential.onConfidentialTransferReceived L282) ----
    /// Users join via `cUSDC.confidentialTransferAndCall(gate, amt, "")` (deposit) or
    /// `cSHARE.confidentialTransferAndCall(gate, amt, "")` (withdrawal). No `join()` exists (BATCHER-NOTES §2).
    function onConfidentialTransferReceived(
        address,
        address from,
        euint64 amount,
        bytes calldata
    ) external returns (ebool) {
        uint256 w = currentWindow;
        require(windows[w].status == Status.Pending, "window not accepting");
        if (msg.sender == address(cUSDC)) {
            windows[w].D = FHE.add(windows[w].D, amount);
            depositIntent[w][from] = FHE.add(depositIntent[w][from], amount);
            FHE.allowThis(windows[w].D);
            FHE.allowThis(depositIntent[w][from]);
            FHE.allow(depositIntent[w][from], from);
            emit JoinedDeposit(w, from, amount);
        } else if (msg.sender == address(cSHARE)) {
            windows[w].W = FHE.add(windows[w].W, amount);
            withdrawIntent[w][from] = FHE.add(withdrawIntent[w][from], amount);
            FHE.allowThis(windows[w].W);
            FHE.allowThis(withdrawIntent[w][from]);
            FHE.allow(withdrawIntent[w][from], from);
            emit JoinedWithdraw(w, from, amount);
        } else {
            revert Unauthorized();
        }
        ebool ok = FHE.asEbool(true);
        FHE.allowTransient(ok, msg.sender);
        return ok;
    }

    // ---- dispatch: reveal ONLY dir + net ----
    function dispatch() external {
        uint256 w = currentWindow;
        Window storage win = windows[w];
        uint40 dispatchableAt = win.openedAt + minBatchAge;
        require(block.timestamp >= dispatchableAt, WindowStillOpen(w, dispatchableAt));
        require(win.status == Status.Pending, BadState(w, win.status));

        // value the share intents in cUSDC at the pinned rate: Wv = W · pin / 1e6
        euint64 Wv = _mulDivScalar(win.W, win.pinRate6, 1e6);
        ebool dir = FHE.ge(win.D, Wv);
        euint64 net = FHE.select(dir, FHE.sub(win.D, Wv), FHE.sub(Wv, win.D)); // dir guarantees the correct order
        win.dir = dir;
        win.net = net;
        FHE.allowThis(dir);
        FHE.allowThis(net);
        // ===== the ONLY makePubliclyDecryptable calls in the whole contract =====
        FHE.makePubliclyDecryptable(dir);
        FHE.makePubliclyDecryptable(net);
        // =======================================================================
        win.status = Status.Dispatched;

        // open the next window
        uint256 nw = w + 1;
        currentWindow = nw;
        windows[nw].openedAt = uint40(block.timestamp);
        windows[nw].pinRate6 = uint64(IYieldVault(vault).sharePrice6());
        windows[nw].status = Status.Pending;
        emit Dispatched(w, FHE.toBytes32(dir), FHE.toBytes32(net));
        emit BatchWindowOpened(nw, uint40(block.timestamp) + minBatchAge);
    }

    // ---- finalize (epoch-machine discipline: replay guard, storage-rebuilt handles, checkSignatures) ----
    // PIN-ONLY MODEL (CP4 ruling): every claim on BOTH sides settles at the window's pinned rate — matched
    // AND net. No blended rate, no per-side total revealed, no encrypted division. The net leg is routed
    // physically so the gate ends up holding the right token mix; a DRIFT GUARD requires the realized vault
    // rate to equal the pin exactly (our vault only moves on keeper drip), else the batch cancels with full
    // refunds. Mirrors the validated P6 finalize pattern (GhostLendPool.finalizeEpoch): raw `cleartexts`
    // signature-checked against the storage-rebuilt handle list, then abi.decode'd.
    function finalizeGate(uint256 w, bytes calldata cleartexts, bytes calldata decryptionProof) external nonReentrant {
        Window storage win = windows[w];
        require(win.status == Status.Dispatched, BadState(w, win.status)); // replay guard

        bytes32[] memory handles = new bytes32[](2);
        handles[0] = FHE.toBytes32(win.dir); // fixed order, rebuilt from storage (never calldata)
        handles[1] = FHE.toBytes32(win.net);
        FHE.checkSignatures(handles, cleartexts, decryptionProof);

        (uint256 dirClear, uint256 netClear) = abi.decode(cleartexts, (uint256, uint256));
        win.dirClear = dirClear != 0;
        win.netClear = uint64(netClear);

        if (netClear == 0) {
            // PERFECT NETTING (#3): D == Wv. No boundary crossing; both sides settle at the pinned rate.
            // Solvent by construction (gate holds exactly D cUSDC + W cSHARE = the pin-rate claims); no
            // vault route, so the drift guard is irrelevant here.
            win.status = Status.Finalized;
            emit Finalized(w, 0);
            return;
        }

        // DRIFT GUARD (ruling #2, mandatory in-code): the realized vault rate must equal the pin exactly.
        // Checked BEFORE any irreversible unwrap so a violation leaves every intent intact for a full quit()
        // refund. The MockYieldVault only moves on a keeper drip, so exact equality is the correct test;
        // keeper discipline (drip → open → dispatch, never during a live window) keeps this true in practice.
        uint64 realized = uint64(IYieldVault(vault).sharePrice6());
        if (realized != win.pinRate6) {
            win.status = Status.Canceled;
            emit Canceled(w, realized, win.pinRate6);
            return; // participants recover their full encrypted intents via quit()
        }

        // NET LEG: unwrap exactly the residual from the winning side's token, so the gate can route it
        // through the vault. deposit-win → unwrap `net` cUSDC; withdraw-win → unwrap the share-equivalent
        // of `net` (rounded UP via previewWithdraw so the redeem yields >= net USDC — surplus is gate dust).
        IERC7984ERC20Wrapper src = win.dirClear ? cUSDC : cSHARE;
        uint64 unwrapAmount = win.dirClear
            ? uint64(netClear)
            : uint64(IYieldVault(vault).previewWithdraw(netClear));

        euint64 amtEnc = FHE.asEuint64(unwrapAmount);
        FHE.allowThis(amtEnc);
        FHE.allowTransient(amtEnc, address(src));
        // Reuse the batcher's self-balance unwrap idiom (BatcherConfidential.dispatchBatch L195): pass the
        // owned handle as an externalEuint64 with an empty proof.
        win.unwrapReqId = src.unwrap(
            address(this),
            address(this),
            externalEuint64.wrap(euint64.unwrap(amtEnc)),
            ""
        );
        win.status = Status.Routing;
        emit RouteInitiated(w, win.dirClear, unwrapAmount);
    }

    // ---- route callback: finalize the net-leg unwrap, run the vault route, re-wrap, mark Finalized ----
    // Second async step (mirrors BatcherConfidential.dispatchBatchCallback L210): the keeper publicDecrypts
    // the unwrap-amount handle and calls this. try/catch checkSignatures fallback is the base's idiom.
    function routeGate(uint256 w, uint64 unwrapClear, bytes calldata decryptionProof) external nonReentrant {
        Window storage win = windows[w];
        require(win.status == Status.Routing, BadState(w, win.status)); // replay guard

        IERC7984ERC20Wrapper src = win.dirClear ? cUSDC : cSHARE;
        try src.finalizeUnwrap(win.unwrapReqId, unwrapClear, decryptionProof) {
            // unwrap released `unwrapClear` underlying to the gate
        } catch {
            bytes32[] memory handles = new bytes32[](1);
            handles[0] = euint64.unwrap(src.unwrapAmount(win.unwrapReqId));
            FHE.checkSignatures(handles, abi.encode(unwrapClear), decryptionProof);
        }

        if (win.dirClear) {
            // deposit-win: net USDC → vault.deposit → shares → wrap into cSHARE (joins the matched W shares)
            uint256 shares = IYieldVault(vault).deposit(unwrapClear, address(this));
            cSHARE.wrap(address(this), shares);
        } else {
            // withdraw-win: shares → vault.withdraw exactly `net` USDC → wrap into cUSDC (joins matched D)
            IYieldVault(vault).withdraw(win.netClear, address(this), address(this));
            cUSDC.wrap(address(this), win.netClear);
        }

        win.status = Status.Finalized;
        emit Finalized(w, win.netClear);
    }

    // ---- claims (pro-rata round-down, attribution: BatcherConfidential._claim L367). Zero-net: at pin. ----
    function claimDeposit(uint256 w) external nonReentrant returns (euint64 shares) {
        Window storage win = windows[w];
        require(win.status == Status.Finalized, BadState(w, win.status));
        euint64 intent = depositIntent[w][msg.sender];
        shares = _mulDivScalar(intent, 1e6, win.pinRate6); // cUSDC → shares at pin
        FHE.allowTransient(shares, address(cSHARE));
        cSHARE.confidentialTransfer(msg.sender, shares);
        depositIntent[w][msg.sender] = FHE.asEuint64(0);
        FHE.allowThis(depositIntent[w][msg.sender]);
        emit Claimed(w, msg.sender, shares);
    }

    function claimWithdraw(uint256 w) external nonReentrant returns (euint64 usdc) {
        Window storage win = windows[w];
        require(win.status == Status.Finalized, BadState(w, win.status));
        euint64 intent = withdrawIntent[w][msg.sender];
        usdc = _mulDivScalar(intent, win.pinRate6, 1e6); // shares → cUSDC at pin
        FHE.allowTransient(usdc, address(cUSDC));
        cUSDC.confidentialTransfer(msg.sender, usdc);
        withdrawIntent[w][msg.sender] = FHE.asEuint64(0);
        FHE.allowThis(withdrawIntent[w][msg.sender]);
        emit Claimed(w, msg.sender, usdc);
    }

    // ---- quit / cancel-refund (attribution: BatcherConfidential.quit L157) ----
    function quit(uint256 w) external nonReentrant {
        Window storage win = windows[w];
        require(win.status == Status.Pending || win.status == Status.Canceled, BadState(w, win.status));
        euint64 dep = depositIntent[w][msg.sender];
        euint64 wd = withdrawIntent[w][msg.sender];
        if (euint64.unwrap(dep) != bytes32(0)) {
            FHE.allowTransient(dep, address(cUSDC));
            cUSDC.confidentialTransfer(msg.sender, dep);
            if (win.status == Status.Pending) win.D = FHESafeMath.saturatingSub(win.D, dep);
            depositIntent[w][msg.sender] = FHE.asEuint64(0);
            FHE.allowThis(depositIntent[w][msg.sender]);
            FHE.allowThis(win.D);
        }
        if (euint64.unwrap(wd) != bytes32(0)) {
            FHE.allowTransient(wd, address(cSHARE));
            cSHARE.confidentialTransfer(msg.sender, wd);
            if (win.status == Status.Pending) win.W = FHESafeMath.saturatingSub(win.W, wd);
            withdrawIntent[w][msg.sender] = FHE.asEuint64(0);
            FHE.allowThis(withdrawIntent[w][msg.sender]);
            FHE.allowThis(win.W);
        }
    }

    // ---- views ----
    function windowInfo(
        uint256 w
    ) external view returns (uint64 pinRate6, uint40 openedAt, Status status, bool dirClear, uint64 netClear) {
        Window storage win = windows[w];
        return (win.pinRate6, win.openedAt, win.status, win.dirClear, win.netClear);
    }

    /// Reveal-surface probe (ruling #2 test): are the aggregates / intents publicly decryptable? Only
    /// dir & net must ever be. `dispatchableIn` for the UI countdown.
    function revealed(
        uint256 w,
        address who
    ) external view returns (bool dirRev, bool netRev, bool dRev, bool wRev, bool depIntentRev, bool wdIntentRev) {
        Window storage win = windows[w];
        dirRev = FHE.isPubliclyDecryptable(win.dir);
        netRev = FHE.isPubliclyDecryptable(win.net);
        dRev = FHE.isPubliclyDecryptable(win.D);
        wRev = FHE.isPubliclyDecryptable(win.W);
        depIntentRev = FHE.isPubliclyDecryptable(depositIntent[w][who]);
        wdIntentRev = FHE.isPubliclyDecryptable(withdrawIntent[w][who]);
    }

    function dispatchableIn() external view returns (uint256) {
        uint256 t = windows[currentWindow].openedAt + minBatchAge;
        return block.timestamp >= t ? 0 : t - block.timestamp;
    }

    /// Net-leg unwrap handle for window `w` (0 until Routing). The keeper publicDecrypts this — it IS the
    /// burn-amount handle (== net, already public) — and passes the cleartext to `routeGate`.
    function unwrapRequestId(uint256 w) external view returns (bytes32) {
        return windows[w].unwrapReqId;
    }

    function intentHandles(uint256 w, address who) external view returns (euint64 dep, euint64 wd) {
        return (depositIntent[w][who], withdrawIntent[w][who]);
    }
}
