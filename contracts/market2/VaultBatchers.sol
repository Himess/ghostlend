// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {BatcherConfidential} from "@openzeppelin/confidential-contracts/finance/BatcherConfidential.sol";
import {IERC7984ERC20Wrapper} from "@openzeppelin/confidential-contracts/interfaces/IERC7984ERC20Wrapper.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title VaultBatcherBase — CP3 ruling #1: EXTEND the audited OZ `BatcherConfidential` directly.
/// @notice Adds a `minBatchAge` window gate on `dispatchBatch` + `BatchWindowOpened` events for the UI
///         countdown ("testnet: 60s · mainnet vault: ~12h"). The join/quit/dispatch/callback/claim state
///         machine, the two-step async-unwrap finalize wiring, and pro-rata claim math are all inherited
///         from the base (BatcherConfidential.sol). Deposits arrive via
///         `fromToken.confidentialTransferAndCall(batcher, amount, "")` → `onConfidentialTransferReceived`
///         (there is NO `join()` — see BATCHER-NOTES §2). Concrete route in the subclasses.
abstract contract VaultBatcherBase is BatcherConfidential, ZamaEthereumConfig {
    IERC4626 public immutable vault;
    uint40 public immutable minBatchAge;
    mapping(uint256 => uint40) public batchOpenedAt;

    event BatchWindowOpened(uint256 indexed batchId, uint40 dispatchableAt);

    error BatchWindowStillOpen(uint256 batchId, uint40 dispatchableAt);

    constructor(
        IERC7984ERC20Wrapper from_,
        IERC7984ERC20Wrapper to_,
        IERC4626 vault_,
        uint40 minBatchAge_
    ) BatcherConfidential(from_, to_) {
        vault = vault_;
        minBatchAge = minBatchAge_;
        batchOpenedAt[1] = uint40(block.timestamp);
        emit BatchWindowOpened(1, uint40(block.timestamp) + minBatchAge_);
    }

    /// minBatchAge gate (ADDENDUM B.3): a batch cannot dispatch until `minBatchAge` after it opened.
    function dispatchBatch() public virtual override {
        uint256 id = currentBatchId();
        uint40 dispatchableAt = batchOpenedAt[id] + minBatchAge;
        require(block.timestamp >= dispatchableAt, BatchWindowStillOpen(id, dispatchableAt));
        super.dispatchBatch();
    }

    /// Record each new batch's open time + emit the countdown event.
    function _getAndIncreaseBatchId() internal virtual override returns (uint256 id) {
        id = super._getAndIncreaseBatchId(); // returns the dispatched id; currentBatchId is now id+1
        uint256 next = id + 1;
        batchOpenedAt[next] = uint40(block.timestamp);
        emit BatchWindowOpened(next, uint40(block.timestamp) + minBatchAge);
    }

    /// UI helper: seconds until the current batch can be dispatched (0 if ready).
    function dispatchableIn() external view returns (uint256) {
        uint256 t = batchOpenedAt[currentBatchId()] + minBatchAge;
        return block.timestamp >= t ? 0 : t - block.timestamp;
    }
}

/// @title DepositBatcher — cUSDC → (unwrap) USDC → vault.deposit → shares → (wrap) cSHARE.
contract DepositBatcher is VaultBatcherBase {
    constructor(
        IERC7984ERC20Wrapper cUSDC_,
        IERC7984ERC20Wrapper cSHARE_,
        IERC4626 vault_,
        uint40 minBatchAge_
    ) VaultBatcherBase(cUSDC_, cSHARE_, vault_, minBatchAge_) {
        // the vault pulls USDC from this batcher on deposit
        SafeERC20.forceApprove(IERC20(cUSDC_.underlying()), address(vault_), type(uint256).max);
    }

    function _executeRoute(uint256, uint256 amount) internal override returns (ExecuteOutcome) {
        uint256 usdcIn = amount * fromToken().rate(); // underlying USDC received from the unwrap
        vault.deposit(usdcIn, address(this)); // shares minted to this; base then wraps them → cSHARE
        return ExecuteOutcome.Complete;
    }

    function routeDescription() public pure override returns (string memory) {
        return "cUSDC -> MockYieldVault.deposit -> cSHARE";
    }
}

/// @title WithdrawBatcher — cSHARE → (unwrap) shares → vault.redeem → USDC → (wrap) cUSDC.
contract WithdrawBatcher is VaultBatcherBase {
    constructor(
        IERC7984ERC20Wrapper cSHARE_,
        IERC7984ERC20Wrapper cUSDC_,
        IERC4626 vault_,
        uint40 minBatchAge_
    ) VaultBatcherBase(cSHARE_, cUSDC_, vault_, minBatchAge_) {}

    function _executeRoute(uint256, uint256 amount) internal override returns (ExecuteOutcome) {
        uint256 sharesIn = amount * fromToken().rate(); // underlying vault shares from the unwrap
        vault.redeem(sharesIn, address(this), address(this)); // USDC to this; base wraps → cUSDC
        return ExecuteOutcome.Complete;
    }

    function routeDescription() public pure override returns (string memory) {
        return "cSHARE -> MockYieldVault.redeem -> cUSDC";
    }
}
