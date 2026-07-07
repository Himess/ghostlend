// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, euint8, ebool, externalEuint64, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";
import {FHESafeMath} from "@openzeppelin/confidential-contracts/utils/FHESafeMath.sol";
import {OracleAdapter} from "./OracleAdapter.sol";
import {InterestRateModel} from "./libraries/InterestRateModel.sol";

interface IWrapperRegistry {
    function isConfidentialTokenValid(address confidentialToken) external view returns (bool);
}

interface IVaultPrice {
    /// USDC (6-dec) per 1e6 vault shares — Market 2's plaintext share-price oracle (MockYieldVault).
    function sharePrice6() external view returns (uint256);
}

/// @title GhostLendPool — confidential isolated-market lending core (CP1 flows + CP2 rate/precision model).
/// @notice Encrypted per-user positions (euint64), plaintext interest indexes. Every user op is synchronous
///         and enforces solvency by CLAMPING the moved amount to the encrypted maximum, recording an
///         encrypted error flag — no reverts on encrypted conditions, both legs always run.
///
/// @dev MONEY MATH IS PURE euint64 (CP1 review directive #2). The design keeps every intermediate product
///      below 2^64 so no euint128 op is ever needed:
///        - amounts are capped at MAX_AMOUNT = 1e12 (1e6 whole tokens) — `_cap` is applied to every
///          encrypted operand before a multiply;
///        - the interest index has 1e6 precision, MAX_INDEX = 4e6 (4x growth cap); amount·index ≤ 4e18;
///        - all price·LLTV·decimals·1e4 plaintext factors are folded, then NORMALIZED to a fixed
///          numerator budget COEF_NUM so `collateral·COEF_NUM ≤ 4e18` and a credit limit is one scalar
///          mul+div (#2c). The user-favorable coefficient is rounded down, the protocol-favorable one up
///          (≤1-unit conservatism, documented per site).
///      Physical lending liquidity is tracked as a euint64 `availCash` accumulator (updated by the real
///      transferred/granted deltas), NOT derived via the index — so `avail ≤ physical balance` holds by
///      construction and `granted == transferred` on every outgoing leg (#3a satisfied structurally).
///
/// @dev Decimals/pricing (locked, PROBE-RESULTS P1): euint64 base units, 6 decimals. Per-BASE-UNIT USD
///      value in 1e18 fixed point: USD-pegged (cUSDC) unit = 1e12; cWETH unit (=1e-6 WETH) = pxE8·1e4.
///      NOTE (README/UI): max position size for the on-chain math is MAX_AMOUNT = 1,000,000 whole tokens.
contract GhostLendPool is ZamaEthereumConfig, ReentrancyGuard {
    using FHESafeMath for euint64;

    uint64 internal constant INDEX_ONE = 1e6;
    uint64 internal constant MAX_INDEX = 4e6; // 4x growth cap (ample for the demo)
    uint64 public constant MAX_AMOUNT = 1e12; // clamp on every user amount & position value (= 1e6 tokens)
    uint256 internal constant BPS = 10_000;
    uint256 internal constant USD_UNIT_E18 = 1e12;
    uint64 internal constant COEF_NUM = 4e6; // normalization budget: MAX_AMOUNT·COEF_NUM = 4e18 < 2^63

    uint64 internal constant E_OK = 0;
    uint64 internal constant E_CLAMPED_COLLATERAL = 1;
    uint64 internal constant E_CLAMPED_LIQUIDITY = 2;
    uint64 internal constant E_CLAMPED_BALANCE = 3;
    uint64 internal constant E_CLAMPED_TREASURY = 4;

    struct Market {
        IERC7984 collateralToken;
        IERC7984 debtToken;
        bool collIsEth;
        bool debtIsEth;
        uint16 lltvBps;
        uint16 liqBonusBps;
        uint16 reserveBps;
        uint64 borrowIndex;
        uint64 supplyIndex;
        uint64 borrowRateRayPerSec;
        uint40 lastAccrual;
        uint32 lastUtilizationBps;
        bool activated; // set on first supply/borrow/leverage — the closeEpoch has-activity gate (H-1)
        euint64 aggScaledSupply; // allowThis-only (for epoch reveal, CP2)
        euint64 aggScaledBorrow; // allowThis-only
        euint64 availCash; // physical lendable liquidity (allowThis-only); ≤ pool debt-token balance
        // ---- Market 2 (leveraged-yield) extras; vault == address(0) for the Chainlink markets ----
        address vault; // MockYieldVault; when set, collateral is priced by sharePrice6() not Chainlink
        euint64 treasury; // pool-owned cSHARE inventory that leverage draws from (allowThis-only)
        euint64 rebalanceQueue; // cUSDC earmarked for the keeper's batched treasury refill (allowThis-only)
    }

    struct Position {
        euint64 scaledSupply;
        euint64 collateral; // unscaled (collateral earns no interest)
        euint64 scaledDebt;
        euint64 lastError;
        uint64 lastErrorNonce;
    }

    OracleAdapter public immutable oracle;
    uint8 public marketCount;
    mapping(uint8 => Market) internal markets;
    mapping(uint8 => mapping(address => Position)) internal positions;

    event OpExecuted(address indexed user, uint8 indexed marketId, uint64 nonce);
    event MarketAdded(uint8 indexed marketId, address collateralToken, address debtToken, uint16 lltvBps);

    // ---- epoch reveal machine (ARCHITECTURE §5): aggregate reveal → rates ----
    uint40 public epochDuration;
    enum EpochStatus {
        None,
        Pending,
        Finalized
    }
    struct Epoch {
        euint64 supplySnap; // aggScaledSupply frozen at close (allowThis + publicly decryptable)
        euint64 borrowSnap;
        uint64 supplyIndexSnap;
        uint64 borrowIndexSnap;
        uint40 closedAt;
        EpochStatus status;
    }
    mapping(uint8 => mapping(uint64 => Epoch)) internal epochs;
    mapping(uint8 => uint64) public currentEpochId;
    mapping(uint8 => uint40) public lastEpochClose;

    // ---- liquidation reveal machine (ARCHITECTURE §6): boolean-only reveal, pool-absorbed ----
    uint40 public constant POKE_TTL = 1 hours;
    enum PokeStatus {
        None,
        Pending,
        Done
    }
    struct Poke {
        address user;
        uint8 marketId;
        PokeStatus status;
        ebool unhealthy; // the ONLY handle made publicly decryptable in liquidation
        euint64 debtSnap; // scaled, frozen at poke (allowThis-only)
        euint64 collSnap;
        uint64 borrowIndexSnap;
        uint40 pokedAt;
    }
    mapping(uint256 => Poke) internal pokes;
    uint256 public nextPokeId;
    // H-2: one active poke per (market,user). Blocks a second poke until the first is finalized or its TTL
    // expires — prevents the double-poke double-seize. Set to pokedAt+TTL on poke, cleared to 0 on finalize.
    mapping(uint8 => mapping(address => uint40)) public pokeBlockedUntil;
    mapping(uint8 => euint64) internal reserves; // pool-owned seized collateral bucket

    event EpochClosed(uint8 indexed marketId, uint64 indexed epochId, bytes32 supplySnap, bytes32 borrowSnap);
    event EpochFinalized(uint8 indexed marketId, uint64 indexed epochId, uint32 utilBps, uint64 borrowRatePerSec);
    event Poked(uint256 indexed pokeId, uint8 indexed marketId, address indexed user, bytes32 unhealthy);
    event LiquidationFinalized(uint256 indexed pokeId, bool unhealthy);

    struct MarketConfig {
        address collateralToken;
        address debtToken;
        bool collIsEth;
        bool debtIsEth;
        uint16 lltvBps;
        uint16 liqBonusBps;
        uint16 reserveBps;
        address vault; // set for Market 2 (vault-priced cSHARE collateral); address(0) otherwise
    }

    constructor(address oracle_, address registry_, MarketConfig[] memory cfgs) {
        oracle = OracleAdapter(oracle_);
        epochDuration = 300; // demo default (5 min); rates lag one epoch by design
        for (uint256 i = 0; i < cfgs.length; i++) {
            MarketConfig memory c = cfgs[i];
            require(c.lltvBps > 0 && c.lltvBps < BPS, "lltv");
            // Chainlink markets need exactly one ETH leg; vault-priced (Market 2) markets ignore the flags.
            require(c.vault != address(0) || c.collIsEth != c.debtIsEth, "exactly one eth leg");
            if (registry_ != address(0)) {
                require(IWrapperRegistry(registry_).isConfidentialTokenValid(c.collateralToken), "coll !valid");
                require(IWrapperRegistry(registry_).isConfidentialTokenValid(c.debtToken), "debt !valid");
            }
            uint8 id = marketCount;
            Market storage m = markets[id];
            m.collateralToken = IERC7984(c.collateralToken);
            m.debtToken = IERC7984(c.debtToken);
            m.collIsEth = c.collIsEth;
            m.debtIsEth = c.debtIsEth;
            m.lltvBps = c.lltvBps;
            m.liqBonusBps = c.liqBonusBps;
            m.reserveBps = c.reserveBps;
            m.vault = c.vault;
            m.borrowIndex = INDEX_ONE;
            m.supplyIndex = INDEX_ONE;
            m.lastAccrual = uint40(block.timestamp);
            // H-1: baseline the aggregate + cash handles to a REAL trivial-encryption-of-0 handle (NOT the
            // null handle). A never-touched market otherwise leaves these as bytes32(0); closeEpoch would then
            // makePubliclyDecryptable a null handle that the KMS rejects → the epoch machine bricks (exactly
            // the bug that bricked an earlier pool, including the supply-with-no-borrows case where only
            // aggScaledBorrow is null). A trivial 0 is decryptable and adds ZERO skew to utilization.
            m.aggScaledSupply = FHE.asEuint64(0);
            m.aggScaledBorrow = FHE.asEuint64(0);
            m.availCash = FHE.asEuint64(0);
            FHE.allowThis(m.aggScaledSupply);
            FHE.allowThis(m.aggScaledBorrow);
            FHE.allowThis(m.availCash);
            marketCount = id + 1;
            emit MarketAdded(id, c.collateralToken, c.debtToken, c.lltvBps);
        }
    }

    // ------------------------- plaintext accrual (ARCHITECTURE §4.1) -------------------------
    function _accrue(Market storage m) internal {
        uint256 dt = block.timestamp - m.lastAccrual;
        if (dt == 0 || m.borrowRateRayPerSec == 0) {
            m.lastAccrual = uint40(block.timestamp);
            return;
        }
        // Per-second rate math stays in uint256 plaintext; only the stored index is 1e6-precision.
        uint256 bi = m.borrowIndex;
        bi += (bi * m.borrowRateRayPerSec * dt) / 1e9; // rate carries 1e9 precision
        if (bi > MAX_INDEX) bi = MAX_INDEX;
        m.borrowIndex = uint64(bi);

        uint256 supplyRate = (uint256(m.borrowRateRayPerSec) * m.lastUtilizationBps * (BPS - m.reserveBps)) /
            (BPS * BPS);
        uint256 si = m.supplyIndex;
        si += (si * supplyRate * dt) / 1e9;
        if (si > MAX_INDEX) si = MAX_INDEX;
        m.supplyIndex = uint64(si);
        m.lastAccrual = uint40(block.timestamp);
    }

    // ------------------------- encrypted math helpers (all euint64) -------------------------
    function _e(uint64 v) private returns (euint64) {
        return FHE.asEuint64(v);
    }

    /// Cap an operand at MAX_AMOUNT so every subsequent scalar multiply stays < 2^64.
    function _cap(euint64 x) private returns (euint64) {
        return FHE.min(x, MAX_AMOUNT);
    }

    function _ceilDiv(uint256 a, uint256 b) private pure returns (uint256) {
        return (a + b - 1) / b;
    }

    // NOTE: `index` is plaintext and equals INDEX_ONE until interest first accrues; at that point every
    // conversion is the identity and we skip the (still euint64, but non-trivial) mul+div.

    /// actual = scaled · index / 1e6, rounded DOWN (crediting the user, or supply-side conservative).
    function _actualDown(euint64 scaled, uint64 index) private returns (euint64) {
        if (index == INDEX_ONE) return scaled;
        return FHE.div(FHE.mul(_cap(scaled), index), INDEX_ONE);
    }

    /// actual = scaled · index / 1e6, rounded UP (debt-side conservative: overstate what is owed).
    /// Caller passes a bounded scaled value (scaledDebt ≤ creditLimit ≤ MAX_AMOUNT ⇒ scaled·index < 2^64),
    /// so no cap is needed here.
    function _actualUp(euint64 scaled, uint64 index) private returns (euint64) {
        if (index == INDEX_ONE) return scaled;
        euint64 num = FHE.add(FHE.mul(scaled, index), INDEX_ONE - 1);
        return FHE.div(num, INDEX_ONE);
    }

    /// scaled (round DOWN) = actual · 1e6 / index — crediting the user (supply add, debt remove).
    /// Caller passes a bounded actual (transferred ≤ MAX_AMOUNT ⇒ actual·1e6 < 2^64).
    function _scaledDown(euint64 actual, uint64 index) private returns (euint64) {
        if (index == INDEX_ONE) return actual;
        return FHE.div(FHE.mul(actual, INDEX_ONE), index);
    }

    /// scaled (round UP) = (actual · 1e6 + index - 1) / index — against the user (debt add, supply remove).
    /// Caller passes a bounded actual (granted ≤ MAX_AMOUNT ⇒ actual·1e6 < 2^64).
    function _scaledUp(euint64 actual, uint64 index) private returns (euint64) {
        if (index == INDEX_ONE) return actual;
        euint64 num = FHE.add(FHE.mul(actual, INDEX_ONE), index - 1);
        return FHE.div(num, index);
    }

    /// x · num / den (scalar), x pre-capped so x·num < 2^64. Folds price·LLTV·decimals (#2c).
    function _mulDivScalar(euint64 x, uint256 num, uint256 den) private returns (euint64) {
        return FHE.div(FHE.mul(x, uint64(num)), uint64(den));
    }

    /// Folded, normalized coefficients (plaintext). creditLimit = collCapped·COEF_NUM/kDenCredit;
    /// requiredColl = debtActual·COEF_NUM/kDenRequired. Credit rounds DOWN (kDenCredit up); required
    /// rounds UP (kDenRequired down) — both protocol-favorable, ≤1-unit conservative.
    function _coefficients(Market storage m) private view returns (uint256 kDenCredit, uint256 kDenRequired) {
        (uint256 collVal, uint256 debtVal) = _unitValsE18(m);
        kDenCredit = _ceilDiv(COEF_NUM * debtVal * BPS, collVal * m.lltvBps);
        kDenRequired = (COEF_NUM * collVal * m.lltvBps) / (debtVal * BPS); // floor
        if (kDenCredit == 0) kDenCredit = 1;
        if (kDenRequired == 0) kDenRequired = 1;
    }

    /// Per-base-unit USD value (1e18 fixed) of each leg. Market 2 (vault != 0): cSHARE collateral is priced
    /// by the vault share price (cSHARE unit = sharePrice6·1e6 in E18; debt cUSDC = 1e12). Otherwise Chainlink.
    function _unitValsE18(Market storage m) private view returns (uint256 collVal, uint256 debtVal) {
        if (m.vault != address(0)) {
            collVal = IVaultPrice(m.vault).sharePrice6() * 1e6;
            debtVal = USD_UNIT_E18;
        } else {
            uint256 pxE8 = uint256(oracle.priceE8());
            collVal = m.collIsEth ? pxE8 * 1e4 : USD_UNIT_E18;
            debtVal = m.debtIsEth ? pxE8 * 1e4 : USD_UNIT_E18;
        }
    }

    /// ZeroBalance-guarded operator pull (ADDENDUM A.1 / PROBE-RESULTS P4). Never reverts; credit the
    /// RETURNED handle, never the requested amount. Returns encrypted 0 if nothing moved.
    function _pullClamped(IERC7984 token, address from, euint64 amt) private returns (euint64 transferred) {
        if (euint64.unwrap(token.confidentialBalanceOf(from)) == bytes32(0)) {
            return _e(0);
        }
        FHE.allowTransient(amt, address(token));
        try token.confidentialTransferFrom(from, address(this), amt) returns (euint64 t) {
            transferred = t;
        } catch {
            transferred = _e(0);
        }
    }

    function _record(Position storage p, uint8 marketId, euint64 err) private {
        p.lastError = err;
        FHE.allowThis(p.lastError);
        FHE.allow(p.lastError, msg.sender);
        unchecked {
            p.lastErrorNonce++;
        }
        emit OpExecuted(msg.sender, marketId, p.lastErrorNonce);
    }

    function _prologue(externalEuint64 extAmt, bytes calldata proof) private returns (euint64 amt) {
        amt = FHE.fromExternal(extAmt, proof);
        amt = FHE.min(amt, MAX_AMOUNT);
    }

    // ============================ Lender: supply / withdrawSupply ============================
    function supply(uint8 marketId, externalEuint64 extAmt, bytes calldata proof) external nonReentrant {
        Market storage m = markets[marketId];
        _accrue(m);
        m.activated = true; // H-1: real activity → closeEpoch permitted
        euint64 amt = _prologue(extAmt, proof);
        euint64 transferred = _pullClamped(m.debtToken, msg.sender, amt);

        euint64 scaledDelta = _scaledDown(transferred, m.supplyIndex);
        Position storage p = positions[marketId][msg.sender];
        p.scaledSupply = FHE.add(p.scaledSupply, scaledDelta);
        m.aggScaledSupply = FHE.add(m.aggScaledSupply, scaledDelta);
        m.availCash = FHE.add(m.availCash, transferred); // real cash in

        FHE.allowThis(p.scaledSupply);
        FHE.allow(p.scaledSupply, msg.sender);
        FHE.allowThis(m.aggScaledSupply);
        FHE.allowThis(m.availCash);
        _record(p, marketId, _e(E_OK));
    }

    function withdrawSupply(uint8 marketId, externalEuint64 extAmt, bytes calldata proof) external nonReentrant {
        Market storage m = markets[marketId];
        _accrue(m);
        euint64 amt = _prologue(extAmt, proof);
        Position storage p = positions[marketId][msg.sender];

        euint64 ownActual = _actualDown(p.scaledSupply, m.supplyIndex); // own claim, conservative down
        euint64 avail = m.availCash; // physical liquidity, no conversion
        euint64 granted = FHE.min(FHE.min(amt, ownActual), avail);

        ebool balBinds = FHE.lt(ownActual, amt);
        ebool liqBinds = FHE.lt(avail, FHE.min(amt, ownActual));
        euint64 err = FHE.select(
            liqBinds,
            _e(E_CLAMPED_LIQUIDITY),
            FHE.select(balBinds, _e(E_CLAMPED_BALANCE), _e(E_OK))
        );

        FHE.allowTransient(granted, address(m.debtToken));
        m.debtToken.confidentialTransfer(msg.sender, granted); // both legs; granted == transferred

        euint64 scaledDelta = _scaledUp(granted, m.supplyIndex); // remove: round up (against user)
        (, p.scaledSupply) = p.scaledSupply.tryDecrease(scaledDelta);
        (, m.aggScaledSupply) = m.aggScaledSupply.tryDecrease(scaledDelta);
        (, m.availCash) = m.availCash.tryDecrease(granted); // real cash out

        FHE.allowThis(p.scaledSupply);
        FHE.allow(p.scaledSupply, msg.sender);
        FHE.allowThis(m.aggScaledSupply);
        FHE.allowThis(m.availCash);
        _record(p, marketId, err);
    }

    // ================= Borrower: depositCollateral / withdrawCollateral / borrow / repay =================
    function depositCollateral(uint8 marketId, externalEuint64 extAmt, bytes calldata proof) external nonReentrant {
        Market storage m = markets[marketId];
        _accrue(m);
        euint64 amt = _prologue(extAmt, proof);
        euint64 transferred = _pullClamped(m.collateralToken, msg.sender, amt);

        Position storage p = positions[marketId][msg.sender];
        p.collateral = FHE.add(p.collateral, transferred);
        FHE.allowThis(p.collateral);
        FHE.allow(p.collateral, msg.sender);
        _record(p, marketId, _e(E_OK));
    }

    function borrow(uint8 marketId, externalEuint64 extAmt, bytes calldata proof) external nonReentrant {
        Market storage m = markets[marketId];
        _accrue(m);
        m.activated = true; // H-1: real activity → closeEpoch permitted
        euint64 amt = _prologue(extAmt, proof);
        Position storage p = positions[marketId][msg.sender];
        (uint256 kDenCredit, ) = _coefficients(m);

        // creditLimit (debt base units) = collateral·COEF_NUM/kDenCredit, capped. Round DOWN.
        euint64 creditLimit = FHE.min(_mulDivScalar(_cap(p.collateral), COEF_NUM, kDenCredit), MAX_AMOUNT);
        euint64 debtActual = _actualUp(p.scaledDebt, m.borrowIndex); // conservative up
        euint64 maxAddl = FHESafeMath.saturatingSub(creditLimit, debtActual);

        euint64 minAmtColl = FHE.min(amt, maxAddl);
        euint64 granted = FHE.min(minAmtColl, m.availCash);

        ebool collBinds = FHE.lt(maxAddl, amt);
        ebool liqBinds = FHE.lt(m.availCash, minAmtColl);
        euint64 err = FHE.select(
            liqBinds,
            _e(E_CLAMPED_LIQUIDITY),
            FHE.select(collBinds, _e(E_CLAMPED_COLLATERAL), _e(E_OK))
        );

        FHE.allowTransient(granted, address(m.debtToken));
        m.debtToken.confidentialTransfer(msg.sender, granted); // both legs; granted == transferred

        euint64 scaledDelta = _scaledUp(granted, m.borrowIndex); // add debt: round up (against user)
        p.scaledDebt = FHE.add(p.scaledDebt, scaledDelta);
        m.aggScaledBorrow = FHE.add(m.aggScaledBorrow, scaledDelta);
        (, m.availCash) = m.availCash.tryDecrease(granted); // real cash out

        FHE.allowThis(p.scaledDebt);
        FHE.allow(p.scaledDebt, msg.sender);
        FHE.allowThis(m.aggScaledBorrow);
        FHE.allowThis(m.availCash);
        _record(p, marketId, err);
    }

    function repay(uint8 marketId, externalEuint64 extAmt, bytes calldata proof) external nonReentrant {
        Market storage m = markets[marketId];
        _accrue(m);
        euint64 amt = _prologue(extAmt, proof);
        Position storage p = positions[marketId][msg.sender];

        euint64 curDebt = _actualUp(p.scaledDebt, m.borrowIndex);
        euint64 payAmt = FHE.min(amt, curDebt); // never pull more than owed
        euint64 transferred = _pullClamped(m.debtToken, msg.sender, payAmt);

        euint64 scaledDelta = _scaledDown(transferred, m.borrowIndex); // remove debt: round down (against user)
        (, p.scaledDebt) = p.scaledDebt.tryDecrease(scaledDelta);
        (, m.aggScaledBorrow) = m.aggScaledBorrow.tryDecrease(scaledDelta);
        m.availCash = FHE.add(m.availCash, transferred); // real cash in

        FHE.allowThis(p.scaledDebt);
        FHE.allow(p.scaledDebt, msg.sender);
        FHE.allowThis(m.aggScaledBorrow);
        FHE.allowThis(m.availCash);
        _record(p, marketId, _e(E_OK));
    }

    function withdrawCollateral(uint8 marketId, externalEuint64 extAmt, bytes calldata proof) external nonReentrant {
        Market storage m = markets[marketId];
        _accrue(m);
        euint64 amt = _prologue(extAmt, proof);
        Position storage p = positions[marketId][msg.sender];
        (, uint256 kDenRequired) = _coefficients(m);

        euint64 debtActual = _actualUp(p.scaledDebt, m.borrowIndex);
        // requiredColl (base units) = debtActual·COEF_NUM/kDenRequired. Round UP (kDenRequired floored).
        euint64 requiredColl = _mulDivScalar(debtActual, COEF_NUM, kDenRequired);
        euint64 freeColl = FHESafeMath.saturatingSub(_cap(p.collateral), requiredColl);

        euint64 granted = FHE.min(amt, freeColl);
        ebool collBinds = FHE.lt(freeColl, amt);
        euint64 err = FHE.select(collBinds, _e(E_CLAMPED_COLLATERAL), _e(E_OK));

        FHE.allowTransient(granted, address(m.collateralToken));
        m.collateralToken.confidentialTransfer(msg.sender, granted); // both legs; granted == transferred

        (, p.collateral) = p.collateral.tryDecrease(granted);
        FHE.allowThis(p.collateral);
        FHE.allow(p.collateral, msg.sender);
        _record(p, marketId, err);
    }

    // ============================ Epoch machine (ARCHITECTURE §5) ============================
    /// Anyone/keeper. Freeze the aggregate scaled handles and expose them for public decryption.
    function closeEpoch(uint8 marketId) external returns (uint64 epochId) {
        Market storage m = markets[marketId];
        require(block.timestamp >= lastEpochClose[marketId] + epochDuration, "too soon");
        // H-1: never close/reveal a market with no real activity, and never snapshot a null aggregate handle.
        // The first guard blocks empty markets (a baseline-only snapshot would compute a meaningless util);
        // the second is defense-in-depth — with the constructor baseline both handles are always non-null.
        require(m.activated, "no activity");
        require(
            euint64.unwrap(m.aggScaledSupply) != bytes32(0) && euint64.unwrap(m.aggScaledBorrow) != bytes32(0),
            "agg uninit"
        );
        epochId = currentEpochId[marketId];
        require(epochs[marketId][epochId].status != EpochStatus.Pending, "prev pending");
        _accrue(m);

        Epoch storage ep = epochs[marketId][epochId];
        ep.supplySnap = m.aggScaledSupply;
        ep.borrowSnap = m.aggScaledBorrow;
        ep.supplyIndexSnap = m.supplyIndex;
        ep.borrowIndexSnap = m.borrowIndex;
        ep.closedAt = uint40(block.timestamp);
        ep.status = EpochStatus.Pending;

        // Aggregates only (pitfall #9: makePubliclyDecryptable is permanent+irrevocable — safe for aggs).
        FHE.allowThis(ep.supplySnap);
        FHE.allowThis(ep.borrowSnap);
        FHE.makePubliclyDecryptable(ep.supplySnap);
        FHE.makePubliclyDecryptable(ep.borrowSnap);
        lastEpochClose[marketId] = uint40(block.timestamp);
        emit EpochClosed(marketId, epochId, FHE.toBytes32(ep.supplySnap), FHE.toBytes32(ep.borrowSnap));
    }

    /// Permissionless finalize. Verifies the KMS proof and moves rates. No caller-dependent effects.
    function finalizeEpoch(
        uint8 marketId,
        uint64 epochId,
        bytes calldata cleartexts,
        bytes calldata decryptionProof
    ) external {
        Epoch storage ep = epochs[marketId][epochId];
        require(ep.status == EpochStatus.Pending, "not pending"); // replay guard (checkSignatures has none)

        // Rebuild the handle list FROM STORAGE in the same order used off-chain (pitfall #10).
        bytes32[] memory handles = new bytes32[](2);
        handles[0] = FHE.toBytes32(ep.supplySnap);
        handles[1] = FHE.toBytes32(ep.borrowSnap);
        FHE.checkSignatures(handles, cleartexts, decryptionProof);

        (uint256 sScaled, uint256 bScaled) = abi.decode(cleartexts, (uint256, uint256));
        // scaled → actual at the snapshot indexes (plaintext).
        uint256 sActual = (sScaled * ep.supplyIndexSnap) / INDEX_ONE;
        uint256 bActual = (bScaled * ep.borrowIndexSnap) / INDEX_ONE;
        uint32 utilBps = sActual == 0 ? 0 : uint32((bActual * BPS) / sActual);
        if (utilBps > BPS) utilBps = uint32(BPS);

        Market storage m = markets[marketId];
        _accrue(m);
        m.lastUtilizationBps = utilBps;
        m.borrowRateRayPerSec = InterestRateModel.borrowRatePerSec(utilBps);

        ep.status = EpochStatus.Finalized;
        currentEpochId[marketId] = epochId + 1;
        emit EpochFinalized(marketId, epochId, utilBps, m.borrowRateRayPerSec);
    }

    // ============================ Liquidation machine (ARCHITECTURE §6) ============================
    /// Permissionless. Reveals ONE bit: is the position unhealthy? (debtActual > collateral·LLTV).
    /// The keeper pokes every open position each epoch uniformly, so a poke carries no information.
    function poke(uint8 marketId, address user) external returns (uint256 pokeId) {
        // H-2: single active poke per position. A stale poke (past TTL, never finalized) stops blocking so a
        // position can always be re-poked; a finalize clears the block immediately.
        require(block.timestamp >= pokeBlockedUntil[marketId][user], "poke pending");
        Market storage m = markets[marketId];
        _accrue(m);
        Position storage p = positions[marketId][user];
        (uint256 kDenCredit, ) = _coefficients(m);

        euint64 creditLimit = FHE.min(_mulDivScalar(_cap(p.collateral), COEF_NUM, kDenCredit), MAX_AMOUNT);
        euint64 debtActual = _actualUp(p.scaledDebt, m.borrowIndex);
        ebool unhealthy = FHE.lt(creditLimit, debtActual); // the ONLY reveal, one bit
        FHE.allowThis(unhealthy);
        FHE.makePubliclyDecryptable(unhealthy);

        pokeId = nextPokeId++;
        Poke storage pk = pokes[pokeId];
        pk.user = user;
        pk.marketId = marketId;
        pk.status = PokeStatus.Pending;
        pk.unhealthy = unhealthy;
        pk.debtSnap = p.scaledDebt;
        pk.collSnap = p.collateral;
        pk.borrowIndexSnap = m.borrowIndex;
        pk.pokedAt = uint40(block.timestamp);
        pokeBlockedUntil[marketId][user] = uint40(block.timestamp) + POKE_TTL; // H-2: block re-poke until finalize/TTL
        FHE.allowThis(pk.debtSnap);
        FHE.allowThis(pk.collSnap);
        emit Poked(pokeId, marketId, user, FHE.toBytes32(unhealthy));
    }

    /// Permissionless finalize. true → absorb internally (NO token transfer — pure accounting, so both
    /// legs are trivially satisfied and nothing about the user's amounts is revealed beyond the bit).
    function finalizeLiquidation(uint256 pokeId, bytes calldata cleartexts, bytes calldata decryptionProof) external {
        Poke storage pk = pokes[pokeId];
        require(pk.status == PokeStatus.Pending, "not pending"); // replay guard
        require(block.timestamp <= pk.pokedAt + POKE_TTL, "stale"); // don't finalize against ancient prices

        bytes32[] memory handles = new bytes32[](1);
        handles[0] = FHE.toBytes32(pk.unhealthy);
        FHE.checkSignatures(handles, cleartexts, decryptionProof);
        bool unhealthy = abi.decode(cleartexts, (uint256)) != 0;

        if (unhealthy) {
            Market storage m = markets[pk.marketId];
            Position storage p = positions[pk.marketId][pk.user];
            _accrue(m); // H-2: accrue to the CURRENT index before re-checking health
            (uint256 kDenCredit, uint256 kDenRequired) = _coefficients(m); // CURRENT price

            // H-2: re-check health against the LIVE position (current collateral/debt/price/index), NOT the
            // frozen poke snapshot. A borrower who repaid, or whose collateral price recovered, between poke
            // and finalize is no longer unhealthy → `stillUnhealthy` is false → seize 0 and leave the debt
            // intact. Together with the single-active-poke lock this closes the cured-borrower over-seize and
            // the double-poke double-seize (a second finalize sees debt already 0 ⇒ nothing left to seize).
            euint64 curCreditLimit = FHE.min(_mulDivScalar(_cap(p.collateral), COEF_NUM, kDenCredit), MAX_AMOUNT);
            euint64 curDebtActual = _actualUp(p.scaledDebt, m.borrowIndex);
            ebool stillUnhealthy = FHE.lt(curCreditLimit, curDebtActual);

            // Seize collateral worth CURRENT debt·(1 + liqBonus), gated on live health. Smaller denominator →
            // more collateral seized.
            uint256 seizeDen = (kDenRequired * BPS) / (BPS + m.liqBonusBps);
            if (seizeDen == 0) seizeDen = 1;
            euint64 seizeRaw = FHE.min(_mulDivScalar(curDebtActual, COEF_NUM, seizeDen), _cap(p.collateral));
            euint64 seize = FHE.select(stillUnhealthy, seizeRaw, _e(0));
            euint64 debtCleared = FHE.select(stillUnhealthy, p.scaledDebt, _e(0));

            (, p.collateral) = p.collateral.tryDecrease(seize); // seize collateral (0 if cured)
            (, m.aggScaledBorrow) = m.aggScaledBorrow.tryDecrease(debtCleared); // clear only the current debt
            p.scaledDebt = FHE.select(stillUnhealthy, _e(0), p.scaledDebt); // wipe debt only if still unhealthy
            reserves[pk.marketId] = FHE.add(reserves[pk.marketId], seize);

            FHE.allowThis(p.collateral);
            FHE.allow(p.collateral, pk.user);
            FHE.allowThis(p.scaledDebt);
            FHE.allow(p.scaledDebt, pk.user);
            FHE.allowThis(m.aggScaledBorrow);
            FHE.allowThis(reserves[pk.marketId]);
        }
        pokeBlockedUntil[pk.marketId][pk.user] = 0; // H-2: poke resolved → allow the position to be re-poked
        pk.status = PokeStatus.Done;
        emit LiquidationFinalized(pokeId, unhealthy);
    }

    // ==================== Market 2: leveraged yield (B.5) ====================
    /// Keeper/deployer seeds the pool's cSHARE treasury (pull cSHARE from the caller).
    function seedTreasury(uint8 marketId, externalEuint64 extShares, bytes calldata proof) external nonReentrant {
        Market storage m = markets[marketId];
        require(m.vault != address(0), "not a vault market");
        euint64 amt = _prologue(extShares, proof);
        euint64 transferred = _pullClamped(m.collateralToken, msg.sender, amt);
        m.treasury = FHE.add(m.treasury, transferred);
        FHE.allowThis(m.treasury);
        _record(positions[marketId][msg.sender], marketId, _e(E_OK));
    }

    /// Closed-form confidential leverage. User deposits cUSDC + picks lev∈{1,2,3,4}; the pool allocates
    /// `target = lev·deposit` of cSHARE from the treasury as collateral, records `target−deposit` cUSDC debt,
    /// and earmarks that draw into the rebalance queue (the keeper later refills the treasury via the
    /// DepositBatcher). No swap, no loops, single tx. Health-by-construction: LLTV 90%, lev≤4 ⇒ debt/coll ≤ 75%.
    /// Cash-conserving: pool cUSDC = availCash + rebalanceQueue + supplier claims; shares conserved between
    /// treasury and users. The boundary is crossed only by the pool's NET (keeper), never by users.
    function openLeveragedYield(
        uint8 marketId,
        externalEuint64 extDeposit,
        externalEuint8 extLev,
        bytes calldata proof
    ) external nonReentrant {
        Market storage m = markets[marketId];
        require(m.vault != address(0), "not a vault market");
        _accrue(m);
        m.activated = true; // H-1: real activity → closeEpoch permitted
        Position storage p = positions[marketId][msg.sender];

        euint64 deposited = _pullClamped(m.debtToken, msg.sender, FHE.min(FHE.fromExternal(extDeposit, proof), MAX_AMOUNT));
        m.availCash = FHE.add(m.availCash, deposited); // deposit cash enters the pool
        euint8 lev = FHE.fromExternal(extLev, proof);

        // target = lev·deposit via scalar muls + select-chain (NO encrypted mul; §9 idiom)
        euint64 target = FHE.select(
            FHE.eq(lev, 4),
            FHE.mul(deposited, 4),
            FHE.select(FHE.eq(lev, 3), FHE.mul(deposited, 3), FHE.select(FHE.eq(lev, 2), FHE.mul(deposited, 2), deposited))
        );

        uint256 sp6 = IVaultPrice(m.vault).sharePrice6();
        euint64 treasuryValueUSDC = _mulDivScalar(_cap(m.treasury), sp6, 1e6); // treasury shares → USDC
        euint64 targetCapCash = FHE.add(deposited, m.availCash); // debt ≤ availCash ⇒ target ≤ deposited+availCash
        euint64 grantedTarget = FHE.min(FHE.min(target, treasuryValueUSDC), targetCapCash);

        ebool treasuryBinds = FHE.lt(treasuryValueUSDC, target);
        ebool cashBinds = FHE.lt(targetCapCash, FHE.min(target, treasuryValueUSDC));
        euint64 err = FHE.select(
            cashBinds,
            _e(E_CLAMPED_LIQUIDITY),
            FHE.select(treasuryBinds, _e(E_CLAMPED_TREASURY), _e(E_OK))
        );

        euint64 debt = FHESafeMath.saturatingSub(grantedTarget, deposited);
        euint64 shares = _mulDivScalar(grantedTarget, 1e6, sp6); // USDC → cSHARE base units

        p.collateral = FHE.add(p.collateral, shares); // leveraged collateral from treasury
        euint64 scaledDelta = _scaledUp(debt, m.borrowIndex);
        p.scaledDebt = FHE.add(p.scaledDebt, scaledDelta);
        m.aggScaledBorrow = FHE.add(m.aggScaledBorrow, scaledDelta);
        (, m.availCash) = m.availCash.tryDecrease(debt); // debt draw leaves available…
        m.rebalanceQueue = FHE.add(m.rebalanceQueue, debt); // …and is earmarked for the keeper refill
        (, m.treasury) = m.treasury.tryDecrease(shares);

        FHE.allowThis(p.collateral);
        FHE.allow(p.collateral, msg.sender);
        FHE.allowThis(p.scaledDebt);
        FHE.allow(p.scaledDebt, msg.sender);
        FHE.allowThis(m.aggScaledBorrow);
        FHE.allowThis(m.availCash);
        FHE.allowThis(m.rebalanceQueue);
        FHE.allowThis(m.treasury);
        _record(p, marketId, err);
    }

    /// Deleverage/close: return `closeShares` of cSHARE to the treasury at the current share price, repay
    /// debt from the share value, pay the remainder to the user as cUSDC (clamped vs availCash, both legs).
    function deleverage(uint8 marketId, externalEuint64 extCloseShares, bytes calldata proof) external nonReentrant {
        Market storage m = markets[marketId];
        require(m.vault != address(0), "not a vault market");
        _accrue(m);
        Position storage p = positions[marketId][msg.sender];

        euint64 closeShares = FHE.min(FHE.min(FHE.fromExternal(extCloseShares, proof), MAX_AMOUNT), _cap(p.collateral));
        uint256 sp6 = IVaultPrice(m.vault).sharePrice6();
        euint64 shareValueUSDC = _mulDivScalar(closeShares, sp6, 1e6);

        euint64 curDebt = _actualUp(p.scaledDebt, m.borrowIndex);
        euint64 debtRepaid = FHE.min(shareValueUSDC, curDebt);
        euint64 remainder = FHESafeMath.saturatingSub(shareValueUSDC, curDebt);
        euint64 payout = FHE.min(remainder, m.availCash); // both legs; clamp remainder by cash

        // accounting
        (, p.collateral) = p.collateral.tryDecrease(closeShares);
        m.treasury = FHE.add(m.treasury, closeShares); // shares back to treasury
        euint64 scaledRepaid = _scaledDown(debtRepaid, m.borrowIndex);
        (, p.scaledDebt) = p.scaledDebt.tryDecrease(scaledRepaid);
        (, m.aggScaledBorrow) = m.aggScaledBorrow.tryDecrease(scaledRepaid);
        // M-1: only the portion of the repayment actually earmarked as cash-owed (rebalanceQueue) frees real
        // availCash. Accrued interest can grow debtRepaid beyond the originally-queued amount; that excess is
        // repaid by the shares returned to the treasury (share-backed), NOT by cUSDC — crediting it to
        // availCash would break the `availCash ≤ physical cUSDC` invariant. Move cash and queue by the SAME min.
        euint64 cashFreed = FHE.min(debtRepaid, m.rebalanceQueue);
        (, m.rebalanceQueue) = m.rebalanceQueue.tryDecrease(cashFreed); // exact (cashFreed ≤ queue)
        m.availCash = FHE.add(m.availCash, cashFreed); // only the cash-backed portion

        FHE.allowTransient(payout, address(m.debtToken));
        m.debtToken.confidentialTransfer(msg.sender, payout);
        (, m.availCash) = m.availCash.tryDecrease(payout);

        FHE.allowThis(p.collateral);
        FHE.allow(p.collateral, msg.sender);
        FHE.allowThis(p.scaledDebt);
        FHE.allow(p.scaledDebt, msg.sender);
        FHE.allowThis(m.treasury);
        FHE.allowThis(m.aggScaledBorrow);
        FHE.allowThis(m.rebalanceQueue);
        FHE.allowThis(m.availCash);
        _record(p, marketId, _e(E_OK));
    }

    /// UI carry math (design lock #5): net carry (bps) = lev·vaultApyBps − (lev−1)·borrowAprBps.
    /// `vaultApyBps` is supplied by the caller (derived from share-price drift off-chain).
    function leverageCarry(
        uint8 marketId,
        uint8 lev,
        uint32 vaultApyBps
    ) external view returns (uint32 borrowAprBps, int256 netCarryBps) {
        Market storage m = markets[marketId];
        borrowAprBps = uint32((uint256(m.borrowRateRayPerSec) * 365 days * BPS) / 1e9);
        netCarryBps = int256(uint256(lev) * vaultApyBps) - int256(uint256(lev - 1) * borrowAprBps);
    }

    function treasuryHandles(uint8 marketId) external view returns (euint64 treasury, euint64 rebalanceQueue) {
        Market storage m = markets[marketId];
        return (m.treasury, m.rebalanceQueue);
    }

    // ------------------------- views -------------------------
    function positionOf(
        uint8 marketId,
        address user
    ) external view returns (euint64 scaledSupply, euint64 collateral, euint64 scaledDebt, euint64 lastError, uint64 nonce) {
        Position storage p = positions[marketId][user];
        return (p.scaledSupply, p.collateral, p.scaledDebt, p.lastError, p.lastErrorNonce);
    }

    function marketInfo(
        uint8 marketId
    )
        external
        view
        returns (
            address collateralToken,
            address debtToken,
            uint16 lltvBps,
            uint16 liqBonusBps,
            uint16 reserveBps,
            uint64 borrowIndex,
            uint64 supplyIndex,
            uint32 lastUtilizationBps,
            euint64 aggScaledSupply,
            euint64 aggScaledBorrow
        )
    {
        Market storage m = markets[marketId];
        return (
            address(m.collateralToken),
            address(m.debtToken),
            m.lltvBps,
            m.liqBonusBps,
            m.reserveBps,
            m.borrowIndex,
            m.supplyIndex,
            m.lastUtilizationBps,
            m.aggScaledSupply,
            m.aggScaledBorrow
        );
    }
}
