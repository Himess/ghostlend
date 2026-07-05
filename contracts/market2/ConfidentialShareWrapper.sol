// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";
import {ERC7984ERC20Wrapper} from "@openzeppelin/confidential-contracts/token/ERC7984/extensions/ERC7984ERC20Wrapper.sol";

/// @title ConfidentialShareWrapper (cSHARE) — the exact production `ERC7984ERC20Wrapper`, over the
///        MockYieldVault share ERC-20 (our csteakcUSDC analogue). Wrap is synchronous; unwrap is the
///        standard two-step async (unwrap → publicDecrypt → finalizeUnwrap).
contract ConfidentialShareWrapper is ERC7984ERC20Wrapper, ZamaEthereumConfig {
    constructor(
        IERC20 shareToken
    ) ERC7984ERC20Wrapper(shareToken) ERC7984("Confidential Vault Share", "cSHARE", "") {}
}
