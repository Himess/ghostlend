# 05 — Zama Protocol: Contract Addresses, Endpoints & Chain IDs (verbatim reference)

> Compiled 2026-07-03 from docs.zama.org raw markdown (`.md` endpoints). Raw dumps: `zama-docs/_raw/addresses-examples/`.
> Every address table below is copied **VERBATIM** from the cited source page — copy addresses from here, never retype.
> **Protocol version status** (source: https://docs.zama.org/protocol/changelog/zama-protocol-change-log.md): **Testnet = FHEVM v0.13** (June 2026), **Mainnet = FHEVM v0.11** (February 2026).

---

## 1. FHEVM host-chain contracts — Sepolia + Ethereum mainnet (ACL, FHEVM Executor, KMS Verifier, InputVerifier, DecryptionOracle, HCU limit, Relayer URL, Gateway chain ID)

Source: https://docs.zama.org/protocol/solidity-guides/smart-contract/configure/contract_addresses.md

# Contract addresses

### Ethereum mainnet

| Contract/Service          | Address                                    |
| ------------------------- | ------------------------------------------ |
| ACL\_CONTRACT             | 0xcA2E8f1F656CD25C01F05d0b243Ab1ecd4a8ffb6 |
| FHEVM\_EXECUTOR\_CONTRACT | 0xD82385dADa1ae3E969447f20A3164F6213100e75 |
| KMS\_VERIFIER\_CONTRACT   | 0x77627828a55156b04Ac0DC0eb30467f1a552BB03 |

### Sepolia testnet

| Contract/Service             | Address/Value                              |
| ---------------------------- | ------------------------------------------ |
| ACL\_CONTRACT                | 0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D |
| FHEVM\_EXECUTOR\_CONTRACT    | 0x92C920834Ec8941d2C77D188936E1f7A6f49c127 |
| KMS\_VERIFIER\_CONTRACT      | 0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A |
| HCU\_LIMIT\_CONTRACT         | 0xa10998783c8CF88D886Bc30307e631D6686F0A22 |
| INPUT\_VERIFIER\_CONTRACT    | 0xBBC1fFCdc7C316aAAd72E807D9b0272BE8F84DA0 |
| DECRYPTION\_ADDRESS          | 0x5D8BD78e2ea6bbE41f26dFe9fdaEAa349e077478 |
| INPUT\_VERIFICATION\_ADDRESS | 0x483b9dE06E4E4C7D35CCf5837A1668487406D955 |
| RELAYER\_URL                 | `https://relayer.testnet.zama.org`         |
| GATEWAY\_CHAIN\_ID           | 10901                                      |

{% hint style="info" %}
You do not need to configure these addresses manually. Inheriting from `ZamaEthereumConfig` automatically resolves the correct addresses based on the current `block.chainid`.
{% endhint %}

---

## 2. Sepolia testnet — Zama token, Wrappers Registry, ALL confidential token mocks (cUSDCMock, cUSDTMock, cWETHMock, cBRONMock, cZAMAMock, ctGBPMock, cXAUtMock, ctGBP) with underlying ERC-20s + mint policy, staking, governance, pausing, fees

Source: https://docs.zama.org/protocol/protocol-apps/addresses/testnet/sepolia.md

# Sepolia

## Token

| Name             | Address                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Zama Token       | [`0xa798B04149e7a61cc95B7D114AD420e8969eA268`](https://sepolia.etherscan.io/address/0xa798B04149e7a61cc95B7D114AD420e8969eA268) |
| Zama OFT Adapter | [`0x55D5258841e9Fd304007683ff4637b0a80fb0e62`](https://sepolia.etherscan.io/address/0x55D5258841e9Fd304007683ff4637b0a80fb0e62) |

## Confidential tokens

> The **mocked** testnet confidential wrappers wrap ERC-20 tokens deployed specifically for testing. Their underlying ERC-20 tokens have a publicly accessible `mint(address to, uint256 amount)` function, limited to **1,000,000 tokens per call**. The **non-mocked** wrappers wrap "official" testnet ERC-20 tokens with restricted minting permissions.
>
> **Note:** The ZAMA (Mock) underlying token is a mock token deployed for testing purposes — it is **not** the real sepolia ZAMA token defined above in the [Token](#token) section.

### Wrappers registry

| Name              | Address                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Wrappers Registry | [`0x2f0750Bbb0A246059d80e94c454586a7F27a128e`](https://sepolia.etherscan.io/address/0x2f0750Bbb0A246059d80e94c454586a7F27a128e) |

### Confidential wrappers

| Name                     | Symbol      | Address                                                                                                                         | Underlying Mint   | Underlying Token                                                                                                                |
| ------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Confidential USDC (Mock) | `cUSDCMock` | [`0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639`](https://sepolia.etherscan.io/address/0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639) | Public (1M limit) | [`0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF`](https://sepolia.etherscan.io/address/0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF) |
| Confidential USDT (Mock) | `cUSDTMock` | [`0x4E7B06D78965594eB5EF5414c357ca21E1554491`](https://sepolia.etherscan.io/address/0x4E7B06D78965594eB5EF5414c357ca21E1554491) | Public (1M limit) | [`0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0`](https://sepolia.etherscan.io/address/0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0) |
| Confidential WETH (Mock) | `cWETHMock` | [`0x46208622DA27d91db4f0393733C8BA082ed83158`](https://sepolia.etherscan.io/address/0x46208622DA27d91db4f0393733C8BA082ed83158) | Public (1M limit) | [`0xff54739b16576FA5402F211D0b938469Ab9A5f3F`](https://sepolia.etherscan.io/address/0xff54739b16576FA5402F211D0b938469Ab9A5f3F) |
| Confidential BRON (Mock) | `cBRONMock` | [`0xaa5612FA27c927a0c7961f5AEFEE5ba3A0F9C891`](https://sepolia.etherscan.io/address/0xaa5612FA27c927a0c7961f5AEFEE5ba3A0F9C891) | Public (1M limit) | [`0xFf021fB13cA64e5354c62c954b949a88cfDEb25E`](https://sepolia.etherscan.io/address/0xFf021fB13cA64e5354c62c954b949a88cfDEb25E) |
| Confidential ZAMA (Mock) | `cZAMAMock` | [`0xf2D628d2598aF4eAF94CB76a437Ff86CA78FfbFB`](https://sepolia.etherscan.io/address/0xf2D628d2598aF4eAF94CB76a437Ff86CA78FfbFB) | Public (1M limit) | [`0x75355a85c6FB9df5f0C80FF54e8747EEe9a0BF57`](https://sepolia.etherscan.io/address/0x75355a85c6FB9df5f0C80FF54e8747EEe9a0BF57) |
| Confidential tGBP (Mock) | `ctGBPMock` | [`0xfCE5c7069c5525eF6c8C2b2E35A745bA20a2F7CC`](https://sepolia.etherscan.io/address/0xfCE5c7069c5525eF6c8C2b2E35A745bA20a2F7CC) | Public (1M limit) | [`0x93c931278A2aad1916783F952f94276eA5111442`](https://sepolia.etherscan.io/address/0x93c931278A2aad1916783F952f94276eA5111442) |
| Confidential XAUt (Mock) | `cXAUtMock` | [`0xe4FcF848739845BC81Dee1d5352cf3844F0a60C7`](https://sepolia.etherscan.io/address/0xe4FcF848739845BC81Dee1d5352cf3844F0a60C7) | Public (1M limit) | [`0x24377AE4AA0C45ecEe71225007f17c5D423dd940`](https://sepolia.etherscan.io/address/0x24377AE4AA0C45ecEe71225007f17c5D423dd940) |
| Confidential tGBP        | `ctGBP`     | [`0x167DC962808B32CFFFc7e14B5018c0bE06A3A208`](https://sepolia.etherscan.io/address/0x167DC962808B32CFFFc7e14B5018c0bE06A3A208) | Restricted        | [`0xf6Ef9ADB61A48E29E36bc873070A46A3D2667ff3`](https://sepolia.etherscan.io/address/0xf6Ef9ADB61A48E29E36bc873070A46A3D2667ff3) |

## Staking

> The testnet staking contracts are using the following mocked mintable ERC-20 token as the underlying asset token: [`0x9216F67a276B4bf1D883C4Ec24095C2bc53C2ef4`](https://sepolia.etherscan.io/address/0x9216F67a276B4bf1D883C4Ec24095C2bc53C2ef4).

### Protocol staking

| Role        | Address                                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| KMS         | [`0x0309b4308A6AC121B9b3A960aC7Bc9bd8256cf38`](https://sepolia.etherscan.io/address/0x0309b4308A6AC121B9b3A960aC7Bc9bd8256cf38) |
| Coprocessor | [`0xc22E393D2A1C1BD65c88d34a3bE4DD77e8952E71`](https://sepolia.etherscan.io/address/0xc22E393D2A1C1BD65c88d34a3bE4DD77e8952E71) |

### Operator staking

| Name          | Role        | Address                                                                                                                         |
| ------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Zama          | KMS         | [`0x454D1738C8eD25C744aF01730EE39a27B683A246`](https://sepolia.etherscan.io/address/0x454D1738C8eD25C744aF01730EE39a27B683A246) |
| Dfns          | KMS         | [`0x8e0bFD7736E9628E2179fB98d44223eF9840fBC7`](https://sepolia.etherscan.io/address/0x8e0bFD7736E9628E2179fB98d44223eF9840fBC7) |
| Figment       | KMS         | [`0x1a5f6C8FFdd869b30FFC73cC9424025829aCad04`](https://sepolia.etherscan.io/address/0x1a5f6C8FFdd869b30FFC73cC9424025829aCad04) |
| Fireblocks    | KMS         | [`0xe85765700Ef107E94fd57FbF1D1863ff87a2948D`](https://sepolia.etherscan.io/address/0xe85765700Ef107E94fd57FbF1D1863ff87a2948D) |
| InfStones     | KMS         | [`0x5F1310b6E8F7DcC24A9A6F74229cf66EE075d4D6`](https://sepolia.etherscan.io/address/0x5F1310b6E8F7DcC24A9A6F74229cf66EE075d4D6) |
| Unit410       | KMS         | [`0xFcC6F9cA8CC4A491B05306D57374a3F6c1f52484`](https://sepolia.etherscan.io/address/0xFcC6F9cA8CC4A491B05306D57374a3F6c1f52484) |
| LayerZero     | KMS         | [`0x6c12eB5d89E6f89399610C7b3Efca40671E82F06`](https://sepolia.etherscan.io/address/0x6c12eB5d89E6f89399610C7b3Efca40671E82F06) |
| Ledger        | KMS         | [`0xe52419533D0322a57d6db28d32463aa6717FeA3c`](https://sepolia.etherscan.io/address/0xe52419533D0322a57d6db28d32463aa6717FeA3c) |
| Omakase       | KMS         | [`0xb1A7026C28cB91604FB7B1669f060aB74A30c255`](https://sepolia.etherscan.io/address/0xb1A7026C28cB91604FB7B1669f060aB74A30c255) |
| Stake Capital | KMS         | [`0xdd0a1B86C8bf653e5bA575bE81bBD733E59803Ae`](https://sepolia.etherscan.io/address/0xdd0a1B86C8bf653e5bA575bE81bBD733E59803Ae) |
| OpenZeppelin  | KMS         | [`0x76427A3830295406d4aBae5b4754749048f58098`](https://sepolia.etherscan.io/address/0x76427A3830295406d4aBae5b4754749048f58098) |
| Etherscan     | KMS         | [`0xDF3f304c291466F21BB711d00E48a0d9AD9D64aF`](https://sepolia.etherscan.io/address/0xDF3f304c291466F21BB711d00E48a0d9AD9D64aF) |
| Conduit       | KMS         | [`0xd6C131CD3c1243934658781a9F7A2CBd1E40f6bF`](https://sepolia.etherscan.io/address/0xd6C131CD3c1243934658781a9F7A2CBd1E40f6bF) |
| Zama          | Coprocessor | [`0x1504646d2e4F924db4c6D6F8e42713e5492604ce`](https://sepolia.etherscan.io/address/0x1504646d2e4F924db4c6D6F8e42713e5492604ce) |
| Blockscape    | Coprocessor | [`0xd32b8E13D9e9733f21068168637e68131122C212`](https://sepolia.etherscan.io/address/0xd32b8E13D9e9733f21068168637e68131122C212) |
| P2P           | Coprocessor | [`0x419Bcec8A8B60688AC7EfeFECC5f83E922191b2A`](https://sepolia.etherscan.io/address/0x419Bcec8A8B60688AC7EfeFECC5f83E922191b2A) |
| Artifact      | Coprocessor | [`0x98B50c22245994360Ecf1F695a7383A3f983AeF4`](https://sepolia.etherscan.io/address/0x98B50c22245994360Ecf1F695a7383A3f983AeF4) |
| Luganodes     | Coprocessor | [`0xe89d9ca0579F19B77af04b201E73A26CECA07600`](https://sepolia.etherscan.io/address/0xe89d9ca0579F19B77af04b201E73A26CECA07600) |

## Governance

| Name                                      | Address                                                                                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Protocol DAO                              | [`0x08e8a84c3c8c7cba165B1adcf67Ae4639eF84f52`](https://sepolia.etherscan.io/address/0x08e8a84c3c8c7cba165B1adcf67Ae4639eF84f52) |
| Governance OApp Sender To Gateway Testnet | [`0x909692c2f4979ca3fa11B5859d499308A1ec4932`](https://sepolia.etherscan.io/address/0x909692c2f4979ca3fa11B5859d499308A1ec4932) |
| Governance OApp Sender To Amoy            | [`0xe57ea2f14f3051296d3965Bae8caAF86acdd6050`](https://sepolia.etherscan.io/address/0xe57ea2f14f3051296d3965Bae8caAF86acdd6050) |

## Pausing

| Name                         | Address                                                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Pauser Set                   | [`0xc62392B4100a1bD45AbDBf91E70f1E4349402b46`](https://sepolia.etherscan.io/address/0xc62392B4100a1bD45AbDBf91E70f1E4349402b46) |
| Pauser Set Wrapper (minting) | [`0xEd03Be6711787f3068885137723504a075514040`](https://sepolia.etherscan.io/address/0xEd03Be6711787f3068885137723504a075514040) |

## Fees

| Name               | Address                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| ProtocolFeesBurner | [`0xFda98943FB461310A5d26769606D302Ea89890e3`](https://sepolia.etherscan.io/address/0xFda98943FB461310A5d26769606D302Ea89890e3) |

---

## 3. Zama Gateway — TESTNET chain contracts

Source: https://docs.zama.org/protocol/protocol-apps/addresses/testnet/gateway.md

# Zama Gateway

## Token

| Name     | Address                                                                                                                              |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Zama OFT | [`0xcE762c7FDaac795D31a266B9247F8958c159c6d4`](https://explorer.testnet.zama.org/address/0xcE762c7FDaac795D31a266B9247F8958c159c6d4) |

## Governance

| Name                     | Address                                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Governance OApp Receiver | [`0x998E9484Aa2a9Ae5B0C8a93B4bD2ea2a5C1B6fF0`](https://explorer.testnet.zama.org/address/0x998E9484Aa2a9Ae5B0C8a93B4bD2ea2a5C1B6fF0) |
| Admin Module             | [`0x53dB449A96d0319DD1f90102dA116Bb9aB0483bB`](https://explorer.testnet.zama.org/address/0x53dB449A96d0319DD1f90102dA116Bb9aB0483bB) |
| Gateway Testnet multisig | [`0x3241b3A4036a356c5D7e36a432Da2B8e5739D9c9`](https://explorer.testnet.zama.org/address/0x3241b3A4036a356c5D7e36a432Da2B8e5739D9c9) |

## Pausing

| Name       | Address                                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Pauser Set | [`0x057dC9855536470A6D8C21d075bA17EA062A5dE7`](https://explorer.testnet.zama.org/address/0x057dC9855536470A6D8C21d075bA17EA062A5dE7) |

## Fees

| Name               | Address                                                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| FeesSenderToBurner | [`0x826106E9428460449d35F724F7098d0a67369AE2`](https://explorer.testnet.zama.org/address/0x826106E9428460449d35F724F7098d0a67369AE2) |

---

## 4. Ethereum MAINNET — Zama token, Wrappers Registry, confidential wrappers (cUSDC, cUSDT, cWETH, ...) with underlying tokens, staking, governance, pausing, fees

Source: https://docs.zama.org/protocol/protocol-apps/addresses/mainnet/ethereum.md

# Ethereum

## Token

| Name             | Address                                                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Zama Token       | [`0xA12CC123ba206d4031D1c7f6223D1C2Ec249f4f3`](https://etherscan.io/address/0xA12CC123ba206d4031D1c7f6223D1C2Ec249f4f3) |
| Zama OFT Adapter | [`0xa798B04149e7a61cc95B7D114AD420e8969eA268`](https://etherscan.io/address/0xa798B04149e7a61cc95B7D114AD420e8969eA268) |

## Confidential tokens

### Wrappers registry

| Name              | Address                                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Wrappers Registry | [`0xeb5015fF021DB115aCe010f23F55C2591059bBA0`](https://etherscan.io/address/0xeb5015fF021DB115aCe010f23F55C2591059bBA0) |

### Confidential wrappers

| Name                    | Symbol        | Address                                                                                                                 | Underlying token                                                                                                      |
| ----------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Confidential USDC       | `cUSDC`       | [`0xe978F22157048E5DB8E5d07971376e86671672B2`](https://etherscan.io/address/0xe978F22157048E5DB8E5d07971376e86671672B2) | [`0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48`](https://etherscan.io/token/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48) |
| Confidential USDT       | `cUSDT`       | [`0xAe0207C757Aa2B4019Ad96edD0092ddc63EF0c50`](https://etherscan.io/address/0xAe0207C757Aa2B4019Ad96edD0092ddc63EF0c50) | [`0xdAC17F958D2ee523a2206206994597C13D831ec7`](https://etherscan.io/token/0xdAC17F958D2ee523a2206206994597C13D831ec7) |
| Confidential WETH       | `cWETH`       | [`0xda9396b82634Ea99243cE51258B6A5Ae512D4893`](https://etherscan.io/address/0xda9396b82634Ea99243cE51258B6A5Ae512D4893) | [`0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2`](https://etherscan.io/token/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2) |
| Confidential BRON       | `cBRON`       | [`0x85dE671c3bec1aDeD752c3Cea943521181C826bc`](https://etherscan.io/address/0x85dE671c3bec1aDeD752c3Cea943521181C826bc) | [`0xBA2C598E11eD093079cC324FCa5BbbA99F616E83`](https://etherscan.io/token/0xBA2C598E11eD093079cC324FCa5BbbA99F616E83) |
| Confidential ZAMA       | `cZAMA`       | [`0x80CB147Fd86dC6dEe3Eee7e4Cee33d1397d98071`](https://etherscan.io/address/0x80CB147Fd86dC6dEe3Eee7e4Cee33d1397d98071) | [`0xA12CC123ba206d4031D1c7f6223D1C2Ec249f4f3`](https://etherscan.io/token/0xA12CC123ba206d4031D1c7f6223D1C2Ec249f4f3) |
| Confidential tGBP       | `ctGBP`       | [`0xa873750ccBafD5ec7Dd13bfD5237d7129832eDD9`](https://etherscan.io/address/0xa873750ccBafD5ec7Dd13bfD5237d7129832eDD9) | [`0x27f6c8289550fce67f6b50bed1f519966afe5287`](https://etherscan.io/token/0x27f6c8289550fce67f6b50bed1f519966afe5287) |
| Confidential XAUt       | `cXAUt`       | [`0x73cc9aF9d6BEFdb3c3fAf8a5E8c05Cb95FdaEEf1`](https://etherscan.io/address/0x73cc9aF9d6BEFdb3c3fAf8a5E8c05Cb95FdaEEf1) | [`0x68749665FF8D2d112Fa859AA293F07A622782F38`](https://etherscan.io/token/0x68749665FF8D2d112Fa859AA293F07A622782F38) |
| Confidential bbqTGBP    | `cbbqTGBP`    | [`0xBA4cFF6ED6F7Cb2A58776dECa4E984b498446762`](https://etherscan.io/address/0xBA4cFF6ED6F7Cb2A58776dECa4E984b498446762) | [`0xbeeffABcd0dB09589Dd21854aa760C52aB4bf04F`](https://etherscan.io/token/0xbeeffABcd0dB09589Dd21854aa760C52aB4bf04F) |
| Confidential steakcUSDC | `csteakcUSDC` | [`0x66Bf74E96900D1a19c7070D939D124f2F565C458`](https://etherscan.io/address/0x66Bf74E96900D1a19c7070D939D124f2F565C458) | [`0xbEEF00A59B577423653A1526c7009bdE103F542B`](https://etherscan.io/token/0xbEEF00A59B577423653A1526c7009bdE103F542B) |

## Staking

### Protocol staking

| Role        | Address                                                                                                                 |
| ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| KMS         | [`0xe9b176CCaA8840DC3b3567bb83e2cD2a6c36F4Ab`](https://etherscan.io/address/0xe9b176CCaA8840DC3b3567bb83e2cD2a6c36F4Ab) |
| Coprocessor | [`0x7147485b892158f2B875f7aC5Ea48A9937C66AE8`](https://etherscan.io/address/0x7147485b892158f2B875f7aC5Ea48A9937C66AE8) |

### Operator staking

| Name          | Role        | Address                                                                                                                 |
| ------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| Zama          | KMS         | [`0x8305d7c59886462B04C71Ecc5c5C331520C2a8E4`](https://etherscan.io/address/0x8305d7c59886462B04C71Ecc5c5C331520C2a8E4) |
| Dfns          | KMS         | [`0xB9689c08A634B076849E61Ea4E42AB44aE2e5e2d`](https://etherscan.io/address/0xB9689c08A634B076849E61Ea4E42AB44aE2e5e2d) |
| Figment       | KMS         | [`0x8a3Bb2a9B28dAD4230a6dfE17124C398eA6416BF`](https://etherscan.io/address/0x8a3Bb2a9B28dAD4230a6dfE17124C398eA6416BF) |
| Fireblocks    | KMS         | [`0xF1BA887932d7559B3b00a58fE92F36CA8D7751d3`](https://etherscan.io/address/0xF1BA887932d7559B3b00a58fE92F36CA8D7751d3) |
| InfStones     | KMS         | [`0x80c03b5be1417D18bAe68d5a1F0f2A97457b0C3c`](https://etherscan.io/address/0x80c03b5be1417D18bAe68d5a1F0f2A97457b0C3c) |
| Unit410       | KMS         | [`0xFCAA267679B8364957560d7420E66Bb012013091`](https://etherscan.io/address/0xFCAA267679B8364957560d7420E66Bb012013091) |
| LayerZero     | KMS         | [`0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF`](https://etherscan.io/address/0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF) |
| Ledger        | KMS         | [`0x78F597F1Dcf5dA536745558368c825654A1A044B`](https://etherscan.io/address/0x78F597F1Dcf5dA536745558368c825654A1A044B) |
| Omakase       | KMS         | [`0xff54739b16576FA5402F211D0b938469Ab9A5f3F`](https://etherscan.io/address/0xff54739b16576FA5402F211D0b938469Ab9A5f3F) |
| Stake Capital | KMS         | [`0xFf021fB13cA64e5354c62c954b949a88cfDEb25E`](https://etherscan.io/address/0xFf021fB13cA64e5354c62c954b949a88cfDEb25E) |
| OpenZeppelin  | KMS         | [`0x75355a85c6FB9df5f0C80FF54e8747EEe9a0BF57`](https://etherscan.io/address/0x75355a85c6FB9df5f0C80FF54e8747EEe9a0BF57) |
| Etherscan     | KMS         | [`0x93c931278A2aad1916783F952f94276eA5111442`](https://etherscan.io/address/0x93c931278A2aad1916783F952f94276eA5111442) |
| Conduit       | KMS         | [`0x50C271E25Ee953DD21E916311db81E228c9Bdb59`](https://etherscan.io/address/0x50C271E25Ee953DD21E916311db81E228c9Bdb59) |
| Zama          | Coprocessor | [`0x5c9401fdA261fDb97188126e130e001DB38F1310`](https://etherscan.io/address/0x5c9401fdA261fDb97188126e130e001DB38F1310) |
| Blockscape    | Coprocessor | [`0x126D6B697aD04228657Ba677c71CfE20A8745b03`](https://etherscan.io/address/0x126D6B697aD04228657Ba677c71CfE20A8745b03) |
| P2P           | Coprocessor | [`0xdB4FE5977d4f78f251C0F821C18C1F7A16Ad3A5e`](https://etherscan.io/address/0xdB4FE5977d4f78f251C0F821C18C1F7A16Ad3A5e) |
| Artifact      | Coprocessor | [`0xf5A0f502C98Df9dC22A4E4f251eC3c75f2aD8098`](https://etherscan.io/address/0xf5A0f502C98Df9dC22A4E4f251eC3c75f2aD8098) |
| Luganodes     | Coprocessor | [`0xdD7fA0C796b3ca4fc1654F4eFFea5c4E9fF57a23`](https://etherscan.io/address/0xdD7fA0C796b3ca4fc1654F4eFFea5c4E9fF57a23) |

## Governance

| Name                   | Address                                                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Protocol DAO           | [`0xB6D69D5F334d8B97B194617B53c6aB62f8681Ef3`](https://etherscan.io/address/0xB6D69D5F334d8B97B194617B53c6aB62f8681Ef3) |
| Governance Multisig    | [`0xE43c73aAb2b6aBBad6d0461997ce1cfea5ABe66f`](https://etherscan.io/address/0xE43c73aAb2b6aBBad6d0461997ce1cfea5ABe66f) |
| Governance OApp Sender | [`0x1c5D750D18917064915901048cdFb2dB815e0910`](https://etherscan.io/address/0x1c5D750D18917064915901048cdFb2dB815e0910) |

## Pausing

| Name                         | Address                                                                                                                 |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Pauser Set                   | [`0xbBfE1680b4a63ED05f7F80CE330BED7C992A586C`](https://etherscan.io/address/0xbBfE1680b4a63ED05f7F80CE330BED7C992A586C) |
| Pauser Set Wrapper (minting) | [`0x08940bC8944A17E64AA9F5398046ABc75bB26699`](https://etherscan.io/address/0x08940bC8944A17E64AA9F5398046ABc75bB26699) |

## Fees

| Name               | Address                                                                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| ProtocolFeesBurner | [`0xd0D284f995a0f2c33648E87bCe79ba04Fdaf8b82`](https://etherscan.io/address/0xd0D284f995a0f2c33648E87bCe79ba04Fdaf8b82) |

---

## 5. Zama Gateway — MAINNET chain contracts

Source: https://docs.zama.org/protocol/protocol-apps/addresses/mainnet/gateway.md

# Zama Gateway

## Token

| Name     | Address                                                                                                                              |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Zama OFT | [`0xcE762c7FDaac795D31a266B9247F8958c159c6d4`](https://explorer.mainnet.zama.org/address/0xcE762c7FDaac795D31a266B9247F8958c159c6d4) |

## Governance

| Name                     | Address                                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Governance OApp Receiver | [`0x10795261A06285D3718674a9Cf98Ea66F7C6A0c6`](https://explorer.mainnet.zama.org/address/0x10795261A06285D3718674a9Cf98Ea66F7C6A0c6) |
| Admin Module             | [`0x57f866b5E7Fb82Fb812Ed3D3C79cdB35E9e91518`](https://explorer.mainnet.zama.org/address/0x57f866b5E7Fb82Fb812Ed3D3C79cdB35E9e91518) |
| Gateway multisig         | [`0x5f0F86BcEad6976711C9B131bCa5D30E767fe2bE`](https://explorer.mainnet.zama.org/address/0x5f0F86BcEad6976711C9B131bCa5D30E767fe2bE) |

## Pausing

| Name       | Address                                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Pauser Set | [`0x571ecb596fCc5c840DA35CbeCA175580db50ac1b`](https://explorer.mainnet.zama.org/address/0x571ecb596fCc5c840DA35CbeCA175580db50ac1b) |

## Fees

| Name               | Address                                                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| FeesSenderToBurner | [`0xd9c00DbE2d5e3f64950a1258DABBC3e75697022A`](https://explorer.mainnet.zama.org/address/0xd9c00DbE2d5e3f64950a1258DABBC3e75697022A) |

---

## 6. Chains — chain IDs, RPC endpoints, block explorers, LayerZero endpoint IDs (testnet + mainnet)

Source: https://docs.zama.org/protocol/protocol-apps/chains.md

# Chains

This page lists the chains involved in the Zama protocol, their block explorers, RPC endpoints, chain IDs, and LayerZero configurations.

## Mainnet

### Block explorers

* Ethereum: <https://etherscan.io/>
* Gateway: <https://explorer.mainnet.zama.org/>
* BSC: <https://bscscan.com/>
* HyperEVM: <https://hyperevmscan.io/>
* Solana: <https://solscan.io/>

### RPC endpoints

* Gateway: <https://rpc.mainnet.zama.org>

### EVM chains - Chain IDs

Not to be confused with Endpoint IDs (see section below).

| Name       | Chain ID |
| ---------- | -------- |
| `Ethereum` | 1        |
| `Gateway`  | 261131   |
| `BSC`      | 56       |
| `HyperEVM` | 999      |

**Note:** These are only for EVM chains, Solana does not have a chain ID (but has a LayerZero endpoint ID).

### LayerZero

#### Endpoint IDs

Those are LayerZero specific and should not be confused with Chain IDs (see section above).

| Name       | Endpoint ID (eid) |
| ---------- | ----------------- |
| `Ethereum` | 30101             |
| `Gateway`  | 30397             |
| `BSC`      | 30102             |
| `SOL`      | 30168             |
| `HyperEVM` | 30367             |

## Testnet

### Block explorers

* Ethereum Sepolia: <https://sepolia.etherscan.io>
* Gateway Testnet: <https://explorer.testnet.zama.org/>
* Polygon Amoy: <https://amoy.polygonscan.com/>

### RPC endpoints

* Gateway Testnet: <https://rpc.testnet.zama.org>

### EVM chains - Chain IDs

| Name               | Chain ID |
| ------------------ | -------- |
| `Ethereum Sepolia` | 11155111 |
| `Gateway Testnet`  | 10901    |
| `BSC Testnet`      | 97       |
| `Polygon Amoy`     | 80002    |

### LayerZero

#### Endpoint IDs

| Name               | Endpoint ID (eid) |
| ------------------ | ----------------- |
| `Ethereum Sepolia` | 40161             |
| `Gateway Testnet`  | 40424             |
| `BSC Testnet`      | 40102             |
| `Polygon Amoy`     | 40267             |

---

## 7. Confidential wrapper — decimals & supply rules (verbatim excerpts relevant to token amounts)

Source: https://docs.zama.org/protocol/protocol-apps/confidential-tokens/confidential-wrapper.md
(The Sepolia/mainnet address tables do not list per-token decimals; these are the governing rules.)

{% hint style="warning" %}

#### **Decimal conversion**

The wrapper enforces a maximum number of decimals for the confidential token. When wrapping, amounts are rounded down and excess tokens are refunded. Currently, this maximum is set to **6 decimals** only. See [Maximum number of decimals](#maximum-number-of-decimals) for more information.
{% endhint %}

### Check the conversion rate and decimals

```solidity
uint256 conversionRate = wrapper.rate();
uint8 wrapperDecimals = wrapper.decimals();
```

**Examples:**

| Underlying Decimals | Wrapper Decimals | Rate  | Effect                       |
| ------------------- | ---------------- | ----- | ---------------------------- |
| 18                  | 6                | 10^12 | 1 wrapped = 10^12 underlying |
| 6                   | 6                | 1     | 1:1 mapping                  |
| 2                   | 2                | 1     | 1:1 mapping                  |


### Maximum number of decimals

The maximum number of decimals `_maxDecimals()` for the confidential token is currently set to **6 decimals** only. This is due to FHE limitations as confidential balances must be represented by the euint64 encrypted datatype.

It is possible that future implementations of the wrapper set a higher `_maxDecimals()` value to better suit the needs of the underlying token. For example, cWBTC might require 8 decimals since using only 6 would make the smallest unit impractically expensive.

At deployment, the confidential wrapper sets its number of decimals as:

* the number of decimals of the underlying token if it is less than `_maxDecimals()`
* `_maxDecimals()` otherwise

**Example with `_maxDecimals()` set to 6**

| Underlying Decimals | Wrapper Decimals | Example    |
| ------------------- | ---------------- | ---------- |
| 18                  | 6                | ZAMA/cZAMA |
| 6                   | 6                | USDT/cUSDT |
| 2                   | 2                | GUSD/cGUSD |

Once a confidential wrapper contract is deployed, this number cannot be updated. It can be viewed with the following view function:

```solidity
wrapper.decimals();
```

### Maximum total supply

The maximum total supply for the confidential token is currently set to `type(uint64).max` (`2^64 - 1`) due to FHE limitations.

---

## 8. Doc-grounded `?ask=` responses (verbatim; labeled — these are generated answers grounded in the docs, not raw doc pages)

### 8.1 ?ask response — cUSDCMock / cWETHMock addresses, underlyings, public mint
Asked against: https://docs.zama.org/protocol/protocol-apps/confidential-tokens.md

# What are the addresses of cUSDCMock and cWETHMock on Sepolia, what are their underlying ERC-20 mock tokens, and do the underlying mocks have public mint functions for testing?

On **Sepolia**, the confidential wrapper addresses and their underlying ERC-20 mocks are:

* **`cUSDCMock`**
  * Wrapper (ERC-7984) address: `0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639`
  * Underlying ERC-20 mock token: `0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF`
  * Underlying mock minting: **public** `mint(address to, uint256 amount)` with a **1,000,000 token per call** limit
* **`cWETHMock`**
  * Wrapper (ERC-7984) address: `0x46208622DA27d91db4f0393733C8BA082ed83158`
  * Underlying ERC-20 mock token: `0xff54739b16576FA5402F211D0b938469Ab9A5f3F`
  * Underlying mock minting: **public** `mint(address to, uint256 amount)` with a **1,000,000 token per call** limit

This is documented on the Sepolia testnet addresses page here: [Sepolia](/protocol/protocol-apps/addresses/testnet/sepolia.md).

# Suggested Follow-up Questions:

If you need more information, consider asking one of these follow-up questions by performing an HTTP GET request on the URL:

- [What are cUSDTMock and cBRONMock addresses?](https://docs.zama.org/protocol?ask=What%20are%20cUSDTMock%20and%20cBRONMock%20addresses%3F)
- [Do all underlying mocks have public mint?](https://docs.zama.org/protocol?ask=Do%20all%20underlying%20mocks%20have%20public%20mint%3F)
- [Any mint limits besides 1M per call?](https://docs.zama.org/protocol?ask=Any%20mint%20limits%20besides%201M%20per%20call%3F)

# Sources:

- [Sepolia](https://docs.zama.org/protocol/protocol-apps/addresses/testnet/sepolia.md)
- [ERC-20 to Wrapped ERC-7984](https://docs.zama.org/protocol/examples/openzeppelin-confidential-contracts/erc7984/erc7984erc20wrappermock.md)
- [Contract addresses](https://docs.zama.org/protocol/solidity-guides/v0.12/smart-contract/configure/contract_addresses.md)
- [Contract addresses](https://docs.zama.org/protocol/solidity-guides/v0.11/smart-contract/configure/contract_addresses.md)
- [Table of all addresses](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/solidity-guides/contract_addresses.md)
- [ERC7984 Standard](https://docs.zama.org/protocol/examples/openzeppelin-confidential-contracts/erc7984.md)
- [forge-fhevm API reference](https://docs.zama.org/protocol/solidity-guides/development-guide/foundry/api.md)
- [WrappedToken](https://docs.zama.org/protocol/sdk/api-references/sdk/wrappedtoken.md)
- [WrappedToken](https://docs.zama.org/protocol/sdk/alpha/api-references/sdk/wrappedtoken.md)
- [Contract builders](https://docs.zama.org/protocol/sdk/api-references/sdk/contract-builders.md)


### 8.2 ?ask response — How to get testnet tokens (faucet vs mint) on Sepolia
Asked against: https://docs.zama.org/protocol/protocol-apps/confidential-tokens.md

# How does a developer get testnet tokens to test confidential token flows on Sepolia (faucet or mint)?

On Sepolia, you don’t use a faucet for **mock confidential tokens**. Instead, you **mint the underlying ERC-20 test tokens**, then **shield** them into the confidential wrapper.

## 1) Mint test tokens (mocked confidential wrappers)

The Sepolia docs state that the **mocked** confidential wrappers wrap ERC-20 tokens deployed specifically for testing. Their underlying ERC-20s expose a **public** function:

* `mint(address to, uint256 amount)`
* with a limit of **1,000,000 tokens per call**

Example (USDC mock):

* Confidential wrapper: `cUSDCMock` = `0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639`
* Underlying token to mint: `0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF`

Source: [Sepolia → Confidential tokens (mocked)](/protocol/protocol-apps/addresses/testnet/sepolia.md)

## 2) Shield underlying → confidential

After you mint the underlying ERC-20, convert it into the confidential token by shielding (the SDK handles approval + wrap).

Core flow:

* create a `WrappedToken` for the **wrapper address**
* call `wrappedToken.shield(amount)`

See: [Shield tokens](/protocol/sdk/guides/shield-tokens.md)

# Suggested Follow-up Questions:

If you need more information, consider asking one of these follow-up questions by performing an HTTP GET request on the URL:

- [Where to mint on Sepolia?](https://docs.zama.org/protocol?ask=Where%20to%20mint%20on%20Sepolia%3F)
- [Which mock token wrapper exists?](https://docs.zama.org/protocol?ask=Which%20mock%20token%20wrapper%20exists%3F)
- [How to shield steps work?](https://docs.zama.org/protocol?ask=How%20to%20shield%20steps%20work%3F)

# Sources:

- [Sepolia](https://docs.zama.org/protocol/protocol-apps/addresses/testnet/sepolia.md)
- [erc7984-tutorial](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/examples/openzeppelin/erc7984-tutorial.md)
- [Token](https://docs.zama.org/protocol/sdk/alpha/api-references/sdk/token.md)
- [erc7984](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/examples/openzeppelin/erc7984.md)
- [Shield tokens](https://docs.zama.org/protocol/sdk/guides/shield-tokens.md)
- [Transfer privately](https://docs.zama.org/protocol/sdk/guides/transfer-privately.md)
- [Zama token quickstart](https://docs.zama.org/protocol/solidity-guides/v0.10/protocol-contracts/token.md)
- [ERC7984 Standard](https://docs.zama.org/protocol/examples/openzeppelin-confidential-contracts/erc7984.md)
- [Confidential wrapper](https://docs.zama.org/protocol/protocol-apps/confidential-tokens/confidential-wrapper.md)
- [Contract addresses](https://docs.zama.org/protocol/solidity-guides/v0.12/smart-contract/configure/contract_addresses.md)


### 8.3 ?ask response — Relayer URL for Sepolia + API key requirement
Asked against: https://docs.zama.org/protocol/protocol-apps/addresses/testnet/sepolia.md

# What is the relayer URL for Sepolia and is an API key required?

* **Relayer URL for Sepolia:** `https://relayer.testnet.zama.org` ([Contract addresses → Sepolia](https://docs.zama.org/spaces/BUOqWvCULaCl6sXPQeTT/pages/9E1NUgqAMRCzgdCyY3d4))
* **Is an API key required?** **No.** The Sepolia testnet relayer is open, so the SDK presets (like `sepolia`) work with **no `auth`** configured ([Authentication](https://docs.zama.org/spaces/94hB9DK1xcnqndoxEHDo/pages/loE9r18MOPrNGk1PROL6), [Configuration](https://docs.zama.org/spaces/94hB9DK1xcnqndoxEHDo/pages/LiMGCKKcn7ud2no5vh7W)).

Only the **Zama-hosted mainnet** relayer requires an API key.

# Suggested Follow-up Questions:

If you need more information, consider asking one of these follow-up questions by performing an HTTP GET request on the URL:

- [Sepolia open key limit?](https://docs.zama.org/protocol?ask=Sepolia%20open%20key%20limit%3F)
- [Mainnet relayer key process?](https://docs.zama.org/protocol?ask=Mainnet%20relayer%20key%20process%3F)
- [Where to find Sepolia relayer URL?](https://docs.zama.org/protocol?ask=Where%20to%20find%20Sepolia%20relayer%20URL%3F)

# Sources:

- [Relayer API keys](https://docs.zama.org/protocol/sdk/alpha/guides/relayer-api-keys.md)
- [Relayer API keys](https://docs.zama.org/protocol/sdk/guides/relayer-api-keys.md)
- [Relayer & Oracle](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/protocol/architecture/relayer_oracle.md)
- [Authentication](https://docs.zama.org/protocol/sdk/alpha/guides/authentication.md)
- [Node.js backend](https://docs.zama.org/protocol/sdk/guides/node-js-backend.md)
- [Sepolia](https://docs.zama.org/protocol/protocol-apps/addresses/testnet/sepolia.md)
- [Migrate from v2 to v3](https://docs.zama.org/protocol/sdk/migration/migrate-v2-to-v3.md)
- [Migrate from v2 to v3](https://docs.zama.org/protocol/sdk/alpha/migration/migrate-v2-to-v3.md)
- [Configuration](https://docs.zama.org/protocol/sdk/alpha/guides/configuration.md)
- [Relayer SDK](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/sdk-guides/sdk-overview.md)
- [Network presets](https://docs.zama.org/protocol/sdk/api-references/sdk/network-presets.md)
- [Contract addresses](https://docs.zama.org/protocol/solidity-guides/v0.12/smart-contract/configure/contract_addresses.md)
- [Contract addresses](https://docs.zama.org/protocol/solidity-guides/v0.11/smart-contract/configure/contract_addresses.md)
- [Table of all addresses](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/solidity-guides/contract_addresses.md)
- [Deploy contracts](https://docs.zama.org/protocol/solidity-guides/development-guide/foundry/deploy.md)
- [Quick start](https://docs.zama.org/protocol/sdk/getting-started/quick-start.md)


### 8.4 ?ask response — Wrappers Registry address on Sepolia
Asked against: https://docs.zama.org/protocol/protocol-apps/addresses/testnet/sepolia.md

# What is the address of the Wrappers Registry on Sepolia?

The **Wrappers Registry** contract address on **Sepolia** is:

`0x2f0750Bbb0A246059d80e94c454586a7F27a128e`

See the Sepolia “Wrappers registry” section here: [Sepolia](/protocol/protocol-apps/addresses/testnet/sepolia.md).

# Suggested Follow-up Questions:

If you need more information, consider asking one of these follow-up questions by performing an HTTP GET request on the URL:

- [Is this Sepolia address latest?](https://docs.zama.org/protocol?ask=Is%20this%20Sepolia%20address%20latest%3F)
- [How to verify a wrapper for a token?](https://docs.zama.org/protocol?ask=How%20to%20verify%20a%20wrapper%20for%20a%20token%3F)
- [Where to find registry methods?](https://docs.zama.org/protocol?ask=Where%20to%20find%20registry%20methods%3F)

# Sources:

- [Contract addresses](https://docs.zama.org/protocol/solidity-guides/v0.12/smart-contract/configure/contract_addresses.md)
- [Registry](https://docs.zama.org/protocol/protocol-apps/confidential-tokens/wrapper-registry.md)
- [Contract addresses](https://docs.zama.org/protocol/solidity-guides/v0.11/smart-contract/configure/contract_addresses.md)
- [Table of all addresses](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/solidity-guides/contract_addresses.md)
- [useWrappersRegistryAddress](https://docs.zama.org/protocol/sdk/alpha/api-references/react/usewrappersregistryaddress.md)
- [useWrapperDiscovery](https://docs.zama.org/protocol/sdk/alpha/api-references/react/usewrapperdiscovery.md)
- [WrappersRegistry](https://docs.zama.org/protocol/sdk/alpha/api-references/sdk/wrappersregistry.md)
- [Sepolia](https://docs.zama.org/protocol/protocol-apps/addresses/testnet/sepolia.md)
- [Shield tokens](https://docs.zama.org/protocol/sdk/guides/shield-tokens.md)
- [Confidential wrapper](https://docs.zama.org/protocol/protocol-apps/confidential-tokens/confidential-wrapper.md)


### 8.5 ?ask response — DecryptionOracle address on Sepolia
Asked against: https://docs.zama.org/protocol/protocol-apps/addresses/testnet/sepolia.md

# What is the DecryptionOracle address on Sepolia?

On **Sepolia**, the **DecryptionOracle** contract address is:

* `0x5D8BD78e2ea6bbE41f26dFe9fdaEAa349e077478`

This is listed as **`DECRYPTION_ADDRESS`** in the [Contract addresses](/protocol/solidity-guides/v0.12/smart-contract/configure/contract_addresses.md) page.

# Suggested Follow-up Questions:

If you need more information, consider asking one of these follow-up questions by performing an HTTP GET request on the URL:

- [What is the Gateway address on Sepolia?](https://docs.zama.org/protocol?ask=What%20is%20the%20Gateway%20address%20on%20Sepolia%3F)
- [What is the Gateway chain ID?](https://docs.zama.org/protocol?ask=What%20is%20the%20Gateway%20chain%20ID%3F)
- [Where can I verify this DecryptionOracle address?](https://docs.zama.org/protocol?ask=Where%20can%20I%20verify%20this%20DecryptionOracle%20address%3F)

# Sources:

- [Contract addresses](https://docs.zama.org/protocol/solidity-guides/v0.12/smart-contract/configure/contract_addresses.md)
- [Table of all addresses](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/solidity-guides/contract_addresses.md)
- [Contract addresses](https://docs.zama.org/protocol/solidity-guides/v0.11/smart-contract/configure/contract_addresses.md)
- [Sepolia](https://docs.zama.org/protocol/protocol-apps/addresses/testnet/sepolia.md)
- [Contract addresses](https://docs.zama.org/protocol/protocol-apps/addresses.md)
- [Deploy contracts](https://docs.zama.org/protocol/solidity-guides/development-guide/foundry/deploy.md)
- [contracts](https://docs.zama.org/protocol/solidity-guides/v0.10/coprocessor/docs/fundamentals/fhevm/contracts.md)
- [Deployment guide for testing](https://docs.zama.org/protocol/solidity-guides/v0.10/protocol-contracts/deploy.md)
- [useShield](https://docs.zama.org/protocol/sdk/api-references/react/useshield.md)
- [useConfidentialIsOperator](https://docs.zama.org/protocol/sdk/api-references/react/useconfidentialisoperator.md)


---

## 9. Cross-source consistency check (protocol-apps addresses pages vs solidity-guides contract_addresses page)

- **No conflicting values found.** The two sources cover **disjoint** contract sets:
  - `solidity-guides/.../contract_addresses.md` lists the FHEVM **host-chain infrastructure** (ACL, FHEVM Executor, KMS Verifier, InputVerifier, DecryptionOracle/`DECRYPTION_ADDRESS`, HCU limit, `INPUT_VERIFICATION_ADDRESS`, relayer URL, Gateway chain ID) — these do NOT appear on the protocol-apps Sepolia page at all.
  - `protocol-apps/addresses/testnet/sepolia.md` lists **token/app-layer** contracts (Zama token, Wrappers Registry, confidential wrapper mocks + underlyings, staking, governance, pausing, fees) — these do NOT appear on the solidity-guides page.
- `GATEWAY_CHAIN_ID = 10901` (solidity-guides page) **matches** `Gateway Testnet` chain ID `10901` (protocol-apps chains page). Consistent.
- The `?ask` responses (section 8) return the same addresses as the verbatim tables (sections 1–2). Consistent.
- Naming note: the solidity-guides table calls the Sepolia decryption oracle `DECRYPTION_ADDRESS` (`0x5D8BD78e2ea6bbE41f26dFe9fdaEAa349e077478`); the `?ask` response confirms this is "the DecryptionOracle contract address" on Sepolia.
- **Gap, not discrepancy:** for Ethereum **mainnet** the solidity-guides page lists only ACL, FHEVM Executor, and KMS Verifier — no InputVerifier / DecryptionOracle / HCU / relayer URL entries. The Sepolia relayer (`https://relayer.testnet.zama.org`) is open (no API key); the Zama-hosted **mainnet** relayer requires an API key and its URL is not published on the fetched pages (see `_fragments/questions-addresses-examples.md`).
- Sepolia host-chain RPC: Zama does not publish its own Sepolia RPC — use any standard Ethereum Sepolia RPC. Zama publishes Gateway RPCs only: `https://rpc.testnet.zama.org` (testnet), `https://rpc.mainnet.zama.org` (mainnet) — see section 6.
- Other mainnet chains exist in the addresses directory but were not dumped here: BSC, HyperEVM, Solana (see https://docs.zama.org/protocol/protocol-apps/addresses.md).

## 10. Quick-reference summary for the lending protocol (Sepolia, Zama Developer Program)

All values verbatim from sections 1–2 above; listed here only for convenience:

| Item | Value |
| --- | --- |
| Chain ID (Ethereum Sepolia) | 11155111 |
| Gateway chain ID (testnet) | 10901 |
| ACL_CONTRACT | 0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D |
| FHEVM_EXECUTOR_CONTRACT | 0x92C920834Ec8941d2C77D188936E1f7A6f49c127 |
| KMS_VERIFIER_CONTRACT | 0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A |
| HCU_LIMIT_CONTRACT | 0xa10998783c8CF88D886Bc30307e631D6686F0A22 |
| INPUT_VERIFIER_CONTRACT | 0xBBC1fFCdc7C316aAAd72E807D9b0272BE8F84DA0 |
| DECRYPTION_ADDRESS (DecryptionOracle) | 0x5D8BD78e2ea6bbE41f26dFe9fdaEAa349e077478 |
| INPUT_VERIFICATION_ADDRESS | 0x483b9dE06E4E4C7D35CCf5837A1668487406D955 |
| RELAYER_URL | https://relayer.testnet.zama.org (no API key on Sepolia) |
| Wrappers Registry (Sepolia) | 0x2f0750Bbb0A246059d80e94c454586a7F27a128e |
| cUSDCMock (ERC-7984 wrapper) | 0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639 |
| cUSDCMock underlying ERC-20 (public mint, 1M/call) | 0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF |
| cWETHMock (ERC-7984 wrapper) | 0x46208622DA27d91db4f0393733C8BA082ed83158 |
| cWETHMock underlying ERC-20 (public mint, 1M/call) | 0xff54739b16576FA5402F211D0b938469Ab9A5f3F |
| Testnet tokens | No faucet: call `mint(address,uint256)` on the underlying mock (≤1,000,000 tokens/call), then wrap/shield into the wrapper (?ask response, section 8.2) |
| Config contract | Inherit `ZamaEthereumConfig` from `@fhevm/solidity/config/ZamaConfig.sol` — resolves all addresses automatically via `block.chainid` (section 1 hint) |
