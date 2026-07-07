# GhostLend — Sepolia production addresses (CP6)

**Network:** Ethereum Sepolia (chainId 11155111) · **Deployer:** `0xF505e2E71df58D7244189072008f25f6b6aaE5ae`
**Deployed:** 2026-07-07 (PHASE-2 redeploy — audit-fixed GhostLendPool + fresh Market2 stack; oracle/cUSDC/cWETH reused) · machine-readable source: [`deployments/sepolia.json`](./sepolia.json)

## Core protocol
| Contract | Address | Notes |
|---|---|---|
| **GhostLendPool** | [`0x1E7Bc12dD59600Ec5A801942e84B26c5ffe860b7`](https://sepolia.etherscan.io/address/0x1E7Bc12dD59600Ec5A801942e84B26c5ffe860b7) | 3 isolated markets (M0/M1/M2) |
| **OracleAdapter** | [`0x0883620ac3cbfe3ff28efb52Ee2998418AAc8495`](https://sepolia.etherscan.io/address/0x0883620ac3cbfe3ff28efb52Ee2998418AAc8495) | wraps Chainlink ETH/USD (reused) |
| Chainlink ETH/USD | [`0x694AA1769357215DE4FAC081bf1f309aDC325306`](https://sepolia.etherscan.io/address/0x694AA1769357215DE4FAC081bf1f309aDC325306) | canonical Sepolia feed |

## Markets (in the pool above)
| id | collateral → debt | LLTV | pricing |
|---|---|---|---|
| **0** | cWETH → cUSDC | 80% | Chainlink ETH/USD |
| **1** | cUSDC → cWETH | 80% | Chainlink ETH/USD |
| **2** | csteakcUSDC → cUSDC | 90% | vault share price (swap-free leverage) |

## Market 2 vault stack + GhostGate
| Contract | Address |
|---|---|
| **MockYieldVault** (ERC-4626, gYVS) | [`0xfaC681ccB925863fa336F89aa81c272b97593838`](https://sepolia.etherscan.io/address/0xfaC681ccB925863fa336F89aa81c272b97593838) |
| **csteakcUSDC** (ConfidentialShareWrapper) | [`0x324A43A9269eB59f23713314df977272c2B8f8d8`](https://sepolia.etherscan.io/address/0x324A43A9269eB59f23713314df977272c2B8f8d8) |
| **DepositBatcher** (cUSDC→vault→cSHARE) | [`0xc0C68055A20849ea3892E2343A8320A8A8E9FA43`](https://sepolia.etherscan.io/address/0xc0C68055A20849ea3892E2343A8320A8A8E9FA43) |
| **WithdrawBatcher** (cSHARE→vault→cUSDC) | [`0x97576Eb9b73B255fB1D813BA69D17E1E57941112`](https://sepolia.etherscan.io/address/0x97576Eb9b73B255fB1D813BA69D17E1E57941112) |
| **GhostGate** (netting gateway) | [`0xb3D9A7c8c8F0E721f9e69bb3eC08a0CB6a03cb95`](https://sepolia.etherscan.io/address/0xb3D9A7c8c8F0E721f9e69bb3eC08a0CB6a03cb95) |

## Tokens (reused live Zama wrappers)
| Token | Wrapper | Underlying (public mint) |
|---|---|---|
| **cUSDC** (6 dec) | [`0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639`](https://sepolia.etherscan.io/address/0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639) | USDC `0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF` |
| **cWETH** (6 dec, rate 1e12) | [`0x46208622DA27d91db4f0393733C8BA082ed83158`](https://sepolia.etherscan.io/address/0x46208622DA27d91db4f0393733C8BA082ed83158) | WETH `0xff54739b16576FA5402F211D0b938469Ab9A5f3F` |

## Etherscan verification — ✅ ALL 7 VERIFIED (Etherscan API V2)
Requires an Etherscan API key: `npx hardhat vars set ETHERSCAN_API_KEY <key>`. Then:
```bash
# simple single-arg contracts
npx hardhat verify --network sepolia 0xfaC681ccB925863fa336F89aa81c272b97593838 0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF   # MockYieldVault
npx hardhat verify --network sepolia 0x324A43A9269eB59f23713314df977272c2B8f8d8 0xfaC681ccB925863fa336F89aa81c272b97593838   # csteakcUSDC
npx hardhat verify --network sepolia 0xc0C68055A20849ea3892E2343A8320A8A8E9FA43 0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639 0x324A43A9269eB59f23713314df977272c2B8f8d8 0xfaC681ccB925863fa336F89aa81c272b97593838 60   # DepositBatcher
npx hardhat verify --network sepolia 0x97576Eb9b73B255fB1D813BA69D17E1E57941112 0x324A43A9269eB59f23713314df977272c2B8f8d8 0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639 0xfaC681ccB925863fa336F89aa81c272b97593838 60   # WithdrawBatcher
npx hardhat verify --network sepolia 0xb3D9A7c8c8F0E721f9e69bb3eC08a0CB6a03cb95 0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639 0x324A43A9269eB59f23713314df977272c2B8f8d8 0xfaC681ccB925863fa336F89aa81c272b97593838 60   # GhostGate
# complex constructor args (pool: struct[] ; oracle): use the args module
npx hardhat verify --network sepolia --constructor-args deployments/verify-pool.js 0x1E7Bc12dD59600Ec5A801942e84B26c5ffe860b7   # GhostLendPool
npx hardhat verify --network sepolia 0x0883620ac3cbfe3ff28efb52Ee2998418AAc8495 0x694AA1769357215DE4FAC081bf1f309aDC325306   # OracleAdapter
```
One-shot: `npm run verify:all` (see package.json).

## Deviation (flagged)
- **Registry validation OFF for this pool.** The core pool (`0x9631…2D64`, M0/M1 only) was deployed with the
  Zama wrapper registry ON. Market 2 needs **csteakcUSDC** as collateral, a fresh `ConfidentialShareWrapper`
  that is **not** in the registry, so this production pool is constructed with `registry = address(0)`
  (validation skipped). The tokens are still real ERC-7984 wrappers; only the on-chain registry gate is
  bypassed. The legacy registry-on core pool remains live for reference.
