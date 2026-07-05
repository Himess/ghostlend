# 04 — Zama FHEVM Developer Tooling

Hardhat template + plugin (mock mode, decryption testing), Sepolia deployment, and frontend SDKs (current `@zama-fhe/sdk` v3 and legacy `@zama-fhe/relayer-sdk`).

Compiled 2026-07-03 from live docs.zama.org pages (raw markdown dumps in `zama-docs/_raw/tooling/`, see `zama-docs/_raw/tooling-manifest.md`) and shallow clones in `_repos/`. Verbatim-first; anything unresolved is marked **UNCERTAIN**.

---

## 0. Version matrix (verified via `npm view`, 2026-07-03)

| Package | Version | Notes |
|---|---|---|
| `@fhevm/solidity` | **0.11.1** | Solidity FHE library (`FHE.sol`, `ZamaConfig.sol`) |
| `@fhevm/hardhat-plugin` | **0.4.2** | provides `hre.fhevm` |
| `@fhevm/mock-utils` | **0.4.2** | mock coprocessor/KMS used by the plugin |
| `@zama-fhe/relayer-sdk` | **0.4.4** (npm latest) | LEGACY low-level SDK. `npm view ... deprecated` returned **empty → NOT deprecated on npm**. Repo `main` is at `0.5.0-rc.1`. |
| `@zama-fhe/sdk` | **3.2.0** (latest); dist-tags `{ "latest": "3.2.0", "alpha": "3.3.0-alpha.8" }` | CURRENT high-level SDK |
| `@zama-fhe/react-sdk` | **3.2.0** | React hooks companion of `@zama-fhe/sdk` |
| fhevm-hardhat-template | repo version **0.4.1**, commit `ec84e1a` (2026-05-04) | Solidity compiler pinned **0.8.27**, evmVersion **cancun** |

Relationship (from docs, sdk-overview.md): "This is the new default SDK for building on the Zama Protocol. The legacy `@zama-fhe/relayer-sdk` lives at github.com/zama-ai/relayer-sdk." The legacy SDK is still what `@fhevm/hardhat-plugin` peer-depends on (plugin README lists peer deps: `@fhevm/mock-utils`, `@fhevm/solidity`, `@zama-fhe/relayer-sdk`, `@nomicfoundation/hardhat-ethers`, `ethers`, `hardhat`). Do **not** confuse `@zama-fhe/sdk` v2→v3 migration with relayer-sdk→sdk migration — they are different package lines (sdk-migrate-v2-v3.md explicitly warns LLMs about this confusion).

---

## 1. fhevm-hardhat-template

Source: `_repos/fhevm-hardhat-template` (github.com/zama-ai/fhevm-hardhat-template, commit `ec84e1aa1b0a`).

### 1.1 Repo tree (complete, excluding .git)

```
fhevm-hardhat-template/
├── .github/workflows/{main.yml, manual.yml, manual-windows.yml}
├── .vscode/, .gitignore, .prettierignore, .prettierrc.yml, .solcover.js, .solhint.json, .solhintignore
├── LICENSE, README.md, eslint.config.mjs, tsconfig.json, package.json, package-lock.json
├── contracts/FHECounter.sol
├── deploy/deploy.ts
├── hardhat.config.ts
├── tasks/FHECounter.ts
├── tasks/accounts.ts
├── test/FHECounter.ts          # mock-mode test (skips on Sepolia)
└── test/FHECounterSepolia.ts   # Sepolia test (skips in mock)
```

### 1.2 Dependencies — verbatim from `package.json` (template v0.4.1)

```json
"dependencies": {
  "@fhevm/mock-utils": "^0.4.2",
  "@fhevm/solidity": "^0.11.1",
  "encrypted-types": "^0.0.4"
},
"devDependencies": {
  "@eslint/js": "^9.39.2",
  "@fhevm/hardhat-plugin": "^0.4.2",
  "@nomicfoundation/hardhat-chai-matchers": "^2.1.0",
  "@nomicfoundation/hardhat-ethers": "^3.1.3",
  "@nomicfoundation/hardhat-network-helpers": "^1.1.2",
  "@nomicfoundation/hardhat-verify": "^2.1.3",
  "@typechain/ethers-v6": "^0.5.1",
  "@typechain/hardhat": "^9.1.0",
  "@types/chai": "^4.3.20",
  "@types/mocha": "^10.0.10",
  "@types/node": "^20.19.30",
  "@zama-fhe/relayer-sdk": "^0.4.1",
  "chai": "^4.5.0",
  "chai-as-promised": "^8.0.2",
  "cross-env": "^7.0.3",
  "eslint": "^9.39.2",
  "eslint-config-prettier": "^10.1.8",
  "ethers": "^6.16.0",
  "globals": "^17.6.0",
  "hardhat": "^2.28.6",
  "hardhat-deploy": "^0.11.45",
  "hardhat-gas-reporter": "^2.3.0",
  "mocha": "^11.7.5",
  "prettier": "^3.8.3",
  "prettier-plugin-solidity": "^2.3.1",
  "rimraf": "^6.1.3",
  "solhint": "^6.2.1",
  "solidity-coverage": "^0.8.17",
  "ts-generator": "^0.1.1",
  "ts-node": "^10.9.2",
  "typechain": "^8.3.2",
  "typescript": "^5.9.3",
  "typescript-eslint": "^8.59.1"
},
"engines": { "node": ">=20", "npm": ">=7.0.0" }
```

Note: Hardhat **2.x** (not Hardhat 3). Plugin README warns: `@nomicfoundation/hardhat-chai-matchers requires v4` of chai.

### 1.3 npm scripts — verbatim

```json
"scripts": {
  "clean": "rimraf ./fhevmTemp ./artifacts ./cache ./coverage ./types ./coverage.json ./dist && npm run typechain",
  "compile": "cross-env TS_NODE_TRANSPILE_ONLY=true hardhat compile",
  "coverage": "cross-env SOLIDITY_COVERAGE=true hardhat coverage --solcoverjs ./.solcover.js --temp artifacts --testfiles \"test/**/*.ts\" && npm run typechain",
  "lint": "npm run lint:sol && npm run lint:ts && npm run prettier:check",
  "lint:sol": "solhint --max-warnings 0 \"contracts/**/*.sol\"",
  "lint:ts": "eslint .",
  "postcompile": "npm run typechain",
  "prettier:check": "prettier --check \"**/*.{js,json,md,sol,ts,yml}\"",
  "prettier:write": "prettier --write \"**/*.{js,json,md,sol,ts,yml}\"",
  "test": "hardhat test",
  "test:sepolia": "hardhat test --network sepolia",
  "build:ts": "tsc --project tsconfig.json",
  "typechain": "cross-env TS_NODE_TRANSPILE_ONLY=true hardhat typechain",
  "chain": "hardhat node --network hardhat --no-deploy",
  "deploy:localhost": "hardhat deploy --network localhost",
  "deploy:sepolia": "hardhat deploy --network sepolia",
  "verify:sepolia": "hardhat verify --network sepolia"
}
```

(Also a large `"overrides"` block pinning transitive deps — ws, axios, elliptic, undici, etc. — see `_repos/fhevm-hardhat-template/package.json` lines 88–105.)

### 1.4 hardhat.config.ts — verbatim (complete)

```typescript
import "@fhevm/hardhat-plugin";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import "@typechain/hardhat";
import "hardhat-deploy";
import "hardhat-gas-reporter";
import type { HardhatUserConfig } from "hardhat/config";
import { vars } from "hardhat/config";
import "solidity-coverage";

import "./tasks/accounts";
import "./tasks/FHECounter";

// Run 'npx hardhat vars setup' to see the list of variables that need to be set

const MNEMONIC: string = vars.get("MNEMONIC", "test test test test test test test test test test test junk");
const INFURA_API_KEY: string = vars.get("INFURA_API_KEY", "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz");

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  namedAccounts: {
    deployer: 0,
  },
  etherscan: {
    apiKey: {
      sepolia: vars.get("ETHERSCAN_API_KEY", ""),
    },
  },
  gasReporter: {
    currency: "USD",
    enabled: process.env.REPORT_GAS ? true : false,
    excludeContracts: [],
  },
  networks: {
    hardhat: {
      accounts: {
        mnemonic: MNEMONIC,
      },
      chainId: 31337,
    },
    anvil: {
      accounts: {
        mnemonic: MNEMONIC,
        path: "m/44'/60'/0'/0/",
        count: 10,
      },
      chainId: 31337,
      url: "http://localhost:8545",
    },
    sepolia: {
      accounts: {
        mnemonic: MNEMONIC,
        path: "m/44'/60'/0'/0/",
        count: 10,
      },
      chainId: 11155111,
      url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
    },
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
  solidity: {
    version: "0.8.27",
    settings: {
      metadata: {
        // Not including the metadata hash
        // https://github.com/paulrberg/hardhat-template/issues/31
        bytecodeHash: "none",
      },
      // Disable the optimizer when debugging
      // https://hardhat.org/hardhat-network/#solidity-optimizer-support
      optimizer: {
        enabled: true,
        runs: 800,
      },
      evmVersion: "cancun",
    },
  },
  typechain: {
    outDir: "types",
    target: "ethers-v6",
  },
};

export default config;
```

### 1.5 Example contract — `contracts/FHECounter.sol` verbatim

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title A simple FHE counter contract
contract FHECounter is ZamaEthereumConfig {
    euint32 private _count;

    function getCount() external view returns (euint32) {
        return _count;
    }

    function increment(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 encryptedEuint32 = FHE.fromExternal(inputEuint32, inputProof);
        _count = FHE.add(_count, encryptedEuint32);
        FHE.allowThis(_count);
        FHE.allow(_count, msg.sender);
    }

    function decrement(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 encryptedEuint32 = FHE.fromExternal(inputEuint32, inputProof);
        _count = FHE.sub(_count, encryptedEuint32);
        FHE.allowThis(_count);
        FHE.allow(_count, msg.sender);
    }
}
```

Note the config base contract name in this template generation: **`ZamaEthereumConfig`** (imported from `@fhevm/solidity/config/ZamaConfig.sol`). Contracts inherit it once and the plugin wires everything else.

### 1.6 Project setup (docs: sg-setup.md)

1. Node.js ≥ 20 (even-numbered LTS — "Hardhat does not support odd-numbered Node.js versions").
2. Create repo from template (GitHub "Use this template" on zama-ai/fhevm-hardhat-template), clone, `npm install`.
3. Configuration via **Hardhat vars**, not `.env`:

```sh
npx hardhat vars set MNEMONIC          # 12-word seed used to derive accounts
npx hardhat vars set INFURA_API_KEY    # Sepolia RPC access
npx hardhat vars set ETHERSCAN_API_KEY # optional, for verification
npx hardhat vars setup                 # lists all vars the project uses
```

Defaults if unset: `MNEMONIC = "test test test test test test test test test test test junk"`, `INFURA_API_KEY = "zzzz…"` — docs warn "These defaults are not suitable for real deployments." Missing var error: `Error HH1201: Cannot find a value for the configuration variable 'MNEMONIC'…`.

---

## 2. MOCK MODE — how local FHEVM tests work

### 2.1 The three FHEVM runtime modes (verbatim table, sg-hardhat-run-test.md)

| Mode | Encryption | Persistent | Chain | Speed | Usage |
| --- | --- | --- | --- | --- | --- |
| Hardhat (default) | 🧪 Mock | ❌ No | In-Memory | ⚡⚡ Very Fast | Fast local testing and coverage |
| Hardhat Node | 🧪 Mock | ✅ Yes | Server | ⚡ Fast | Frontend integration and local persistent testing |
| Sepolia Testnet | 🔐 Real Encryption | ✅ Yes | Server | 🐢 Slow | Full-stack validation with real encrypted data |

Commands: `npx hardhat test --network hardhat` (in-memory mock), `npx hardhat node` + `npx hardhat test --network localhost` (persistent mock), `npx hardhat test --network sepolia` (real).

### 2.2 What the plugin mocks

- The plugin (with `@fhevm/mock-utils`) simulates the whole FHEVM stack in the Hardhat EVM: coprocessor, ACL, KMS/decryption, input verification and the relayer — "No real encryption is used" (sg-hardhat-run-test.md). Archived v0.10 doc (v010-mocked.md) describes the principle: mocked mode "does not actually perform real encryption for encrypted types and instead runs the tests on a local Hardhat node" and lets you use `evm_mine`, `evm_snapshot`, `evm_revert`, etc.
- Test/CLI code detects the environment via `hre.fhevm.isMock` (boolean).
- The **same Solidity and (almost always) the same tests** run in mock and on Sepolia; only speed/persistence/real-crypto differ.
- Coverage (`npm run coverage`) works **only** in mock mode; `solidity-coverage` breaks on tests using `evm_snapshot` — tag those `[skip-on-coverage]` (v010-mocked.md, archived but the coverage script is still in the current template).

### 2.3 The `hre.fhevm` test API — verbatim from `@fhevm/hardhat-plugin@0.4.2` `_types/types.d.ts` (fetched from unpkg)

```typescript
export interface HardhatFhevmRuntimeEnvironment {
    readonly isMock: boolean;
    readonly debugger: HardhatFhevmRuntimeDebugger;
    initializeCLIApi(): Promise<void>;
    parseCoprocessorEvents(logs: (ethers.EventLog | ethers.Log)[] | null | undefined): CoprocessorEvent[];
    computeTransactionHCU(transactionReceipt: ethers.TransactionReceipt): FhevmTransactionHCUInfo;
    assertCoprocessorInitialized(contract: ethers.AddressLike, contractName?: string): Promise<void>;
    getCoprocessorConfig(contractAddress: string): Promise<CoprocessorConfig>;
    getRelayerMetadata(): Promise<relayer.RelayerMetadata>;
    revertedWithCustomErrorArgs(contractName: FhevmContractName, customErrorName: string): [{ interface: ethers.Interface; }, string];
    tryParseFhevmError(e: unknown, options?): Promise<FhevmContractError | undefined>;
    createEncryptedInput(contractAddress: string, userAddress: string): RelayerEncryptedInput;
    createEIP712(publicKey, contractAddresses, startTimestamp, durationDays): KmsUserDecryptEIP712Type;
    createDelegatedUserDecryptEIP712(...): KmsDelegatedUserDecryptEIP712Type;
    generateKeypair(): { publicKey: string; privateKey: string; };
    userDecrypt(handles: HandleContractPair[], privateKey, publicKey, signature, contractAddresses, userAddress, startTimestamp, durationDays): Promise<UserDecryptResults>;
    delegatedUserDecrypt(...): Promise<UserDecryptResults>;
    publicDecrypt(handles: (string | Uint8Array)[]): Promise<PublicDecryptResults>;
    userDecryptEbool(handleBytes32: string, contractAddress: ethers.AddressLike, user: ethers.Signer, options?): Promise<boolean>;
    publicDecryptEbool(handleBytes32: string, options?): Promise<boolean>;
    userDecryptEuint(fhevmType: FhevmTypeEuint, handleBytes32: string, contractAddress: ethers.AddressLike, user: ethers.Signer, options?): Promise<bigint>;
    publicDecryptEuint(fhevmType: FhevmTypeEuint, handleBytes32: string, options?): Promise<bigint>;
    userDecryptEaddress(handleBytes32: string, contractAddress: ethers.AddressLike, user: ethers.Signer, options?): Promise<string>;
    publicDecryptEaddress(handleBytes32: string, options?): Promise<string>;
}
export interface HardhatFhevmRuntimeDebugger {
    createHandleCoder(): FhevmHandleCoder;
    createDecryptionSignatures(handlesBytes32Hex: string[], clearTextValues: (bigint | string | boolean)[]): Promise<string[]>;
    decryptEbool(handleBytes32: ethers.BigNumberish): Promise<boolean>;
    decryptEuint(fhevmType: FhevmTypeEuint, handleBytes32: ethers.BigNumberish): Promise<bigint>;
    decryptEaddress(handleBytes32: ethers.BigNumberish): Promise<`0x${string}`>;
}
```

The concrete class (`FhevmExternalAPI.d.ts`) additionally exposes `createInstance(): Promise<FhevmInstance>` (a legacy-relayer-sdk-shaped instance), `encryptUint / encryptBool / encryptAddress` one-shot helpers, and `typeof(handleBytes32): FhevmTypeName`.

**There is NO `awaitDecryptionOracle` in plugin 0.4.2.** It appears nowhere in the plugin's shipped types, the template repo, or the current docs; the docs ?ask endpoint answers: "I cannot find information about `awaitDecryptionOracle` in the docs available here" (`_raw/ask/ask-mock-public-decrypt.md`). It belonged to the old v0.10-era `FHE.requestDecryption` + on-chain-callback oracle. The current protocol replaced that with the **3-step public decryption flow** (§2.5). Usage in tests:

```ts
import { ethers, fhevm } from "hardhat";           // fhevm module injected by the plugin
import { FhevmType } from "@fhevm/hardhat-plugin"; // enum for typed decrypt helpers
```

Hardhat **tasks** must call `await fhevm.initializeCLIApi();` before using the API (tasks/FHECounter.ts); tests don't need it.

Encrypted input builder (docs sg-hardhat-write-test.md): `fhevm.createEncryptedInput(contractAddress, signerAddress).add32(12345)` … then `const enc = await input.encrypt();` → pass `enc.handles[0]` (the `externalEuintXX` bytes32) and `enc.inputProof` to the contract. Builder methods (legacy-input.md, same builder API): `addBool, add8, add16, add32, add64, add128, add256, addAddress`.

Typed user-decrypt helpers (docs table): `euintXXX → fhevm.userDecryptEuint(...)`, `ebool → fhevm.userDecryptEbool(...)`, `eaddress → fhevm.userDecryptEaddress(...)`. Docs warning: "If either the target smart contract or the user does NOT have FHE permissions, then the decryption call will fail!" (i.e. the contract must have called `FHE.allowThis(handle)` and `FHE.allow(handle, user)`).

### 2.4 COMPLETE verbatim mock test from the template — `test/FHECounter.ts` (encrypted input + user-decrypt round-trip)

```typescript
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { FHECounter, FHECounter__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHECounter")) as FHECounter__factory;
  const fheCounterContract = (await factory.deploy()) as FHECounter;
  const fheCounterContractAddress = await fheCounterContract.getAddress();

  return { fheCounterContract, fheCounterContractAddress };
}

describe("FHECounter", function () {
  let signers: Signers;
  let fheCounterContract: FHECounter;
  let fheCounterContractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ fheCounterContract, fheCounterContractAddress } = await deployFixture());
  });

  it("encrypted count should be uninitialized after deployment", async function () {
    const encryptedCount = await fheCounterContract.getCount();
    // Expect initial count to be bytes32(0) after deployment,
    // (meaning the encrypted count value is uninitialized)
    expect(encryptedCount).to.eq(ethers.ZeroHash);
  });

  it("increment the counter by 1", async function () {
    const encryptedCountBeforeInc = await fheCounterContract.getCount();
    expect(encryptedCountBeforeInc).to.eq(ethers.ZeroHash);
    const clearCountBeforeInc = 0;

    // Encrypt constant 1 as a euint32
    const clearOne = 1;
    const encryptedOne = await fhevm
      .createEncryptedInput(fheCounterContractAddress, signers.alice.address)
      .add32(clearOne)
      .encrypt();

    const tx = await fheCounterContract
      .connect(signers.alice)
      .increment(encryptedOne.handles[0], encryptedOne.inputProof);
    await tx.wait();

    const encryptedCountAfterInc = await fheCounterContract.getCount();
    const clearCountAfterInc = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedCountAfterInc,
      fheCounterContractAddress,
      signers.alice,
    );

    expect(clearCountAfterInc).to.eq(clearCountBeforeInc + clearOne);
  });

  it("decrement the counter by 1", async function () {
    // Encrypt constant 1 as a euint32
    const clearOne = 1;
    const encryptedOne = await fhevm
      .createEncryptedInput(fheCounterContractAddress, signers.alice.address)
      .add32(clearOne)
      .encrypt();

    // First increment by 1, count becomes 1
    let tx = await fheCounterContract
      .connect(signers.alice)
      .increment(encryptedOne.handles[0], encryptedOne.inputProof);
    await tx.wait();

    // Then decrement by 1, count goes back to 0
    tx = await fheCounterContract.connect(signers.alice).decrement(encryptedOne.handles[0], encryptedOne.inputProof);
    await tx.wait();

    const encryptedCountAfterDec = await fheCounterContract.getCount();
    const clearCountAfterInc = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedCountAfterDec,
      fheCounterContractAddress,
      signers.alice,
    );

    expect(clearCountAfterInc).to.eq(0);
  });
});
```

Source: `_repos/fhevm-hardhat-template/test/FHECounter.ts`.

### 2.5 How the ASYNC PUBLIC-DECRYPTION "callback" is exercised in mock tests

Current protocol pattern (docs: solidity-guides/smart-contract/oracle.md, "Public Decryption" — raw dump `_raw/decryption/oracle.md`). It is a 3-step asynchronous flow (this is what a lending protocol uses for e.g. revealing a liquidation decision):

1. **On-chain:** contract calls `FHE.makePubliclyDecryptable(handle)` (globally, permanently marks the ciphertext decryptable) and typically emits an event with the handle.
2. **Off-chain:** any client calls `publicDecrypt([handleA, handleB, ...])` → returns `PublicDecryptResults { clearValues, abiEncodedClearValues, decryptionProof }`.
3. **On-chain "callback" tx:** anyone submits clear values + proof to a contract function that verifies with `FHE.checkSignatures(handlesList, abiEncodedCleartexts, decryptionProof)` — reverts if the proof is invalid — then runs the business logic. "The callback should always verify the signatures and implement a replay protection mechanism."

**Ordering constraint (docs warning, verbatim):** "The decryption proof is cryptographically bound to the specific order of handles passed in the input array. The proof computed for `[efoo, ebar]` is different from the proof computed for `[ebar, efoo]`." The i-th cleartext in `abi.encode(...)` must correspond to the i-th handle.

**In mock tests this is simulated by `hre.fhevm.publicDecrypt(...)`** — the mock KMS produces a `decryptionProof` that the mock `FHE.checkSignatures` accepts on-chain, and tampered proofs/cleartexts revert with `KMSInvalidSigner`. Confirmed by ?ask on run_test.md: "Does `fhevm.publicDecrypt` return a `decryptionProof` that works locally? **Yes.** In the mock Hardhat test, `publicDecryptResults.decryptionProof` is accepted by `FHE.checkSignatures` on-chain and causes the transaction to revert if the proof is invalid." (`_raw/ask/ask-mock-public-decrypt.md`)

Verbatim excerpts from the official example (docs page examples/basic/decryption/heads-or-tails — full dump at `_raw/decryption/heads-or-tails.md`), contract side:

```solidity
function recordAndVerifyWinner(
    uint256 gameId,
    bytes memory abiEncodedClearGameResult,
    bytes memory decryptionProof
) public {
    require(games[gameId].winner == address(0), "Game winner already revealed");

    bytes32[] memory cts = new bytes32[](1);
    cts[0] = FHE.toBytes32(games[gameId].encryptedHasHeadsWon);

    // This FHE call reverts the transaction if the decryption proof is invalid.
    FHE.checkSignatures(cts, abiEncodedClearGameResult, decryptionProof);

    bool decodedClearGameResult = abi.decode(abiEncodedClearGameResult, (bool));
    address winner = decodedClearGameResult ? games[gameId].headsPlayer : games[gameId].tailsPlayer;
    games[gameId].winner = winner;
}
```

…and the hardhat mock test side (same page, `HeadsOrTails.ts`; guarded by `if (!hre.fhevm.isMock) throw ...`):

```ts
// Call the Zama Relayer to compute the decryption
const publicDecryptResults = await fhevm.publicDecrypt([encryptedBool]);

const abiEncodedClearGameResult = publicDecryptResults.abiEncodedClearValues;
const decryptionProof = publicDecryptResults.decryptionProof;

// Forward the PublicDecryptResults content to the on-chain contract, which
// verifies the proof and declares the winner
await contract.recordAndVerifyWinner(gameId, abiEncodedClearGameResult, decryptionProof);
```

Negative test (tampered proof must revert — verbatim):

```ts
const publicDecryptResults = await fhevm.publicDecrypt([gameCreatedEvent.encryptedHasHeadsWon]);
await expect(
  contract.recordAndVerifyWinner(
    gameCreatedEvent.gameId,
    publicDecryptResults.abiEncodedClearValues,
    publicDecryptResults.decryptionProof + "dead",
  ),
).to.be.revertedWithCustomError(
  { interface: new EthersT.Interface(["error KMSInvalidSigner(address invalidSigner)"]) },
  "KMSInvalidSigner",
);
```

The same page also tests a forged cleartext and a cross-request replay (proof of game 2 used for game 1) — all revert with `KMSInvalidSigner`. `PublicDecryptResults` type (oracle.md, verbatim):

```typescript
export type PublicDecryptResults = {
  clearValues: Record<`0x${string}`, bigint | boolean | `0x${string}`>;
  abiEncodedClearValues: `0x${string}`;
  decryptionProof: `0x${string}`;
};
```

For single values the plugin also has typed shortcuts that skip manual proof plumbing when you only need the cleartext in the test (not the on-chain verify): `fhevm.publicDecryptEbool / publicDecryptEuint / publicDecryptEaddress`.

### 2.6 Debug decryption + mock-vs-Sepolia limitations

- `hre.fhevm.debugger.decryptEuint/decryptEbool/decryptEaddress` decrypt ANY handle **bypassing ACL** — mock-only debugging aid (plugin 0.4.2 types; the archived v0.10 analog `debug.decrypt[XX]` doc states: works "only in mocked environments", "Attempting to use them in a production environment will result in an error", relies on private keys — never production).
- Mock limitations vs real Sepolia:
  - No real encryption/ZK proofs — timing, HCU costs and relayer latency are not representative. Use `fhevm.computeTransactionHCU(receipt)` in mock to estimate HCU.
  - Mock tests **cannot run on Sepolia**; Sepolia tests **cannot run in mock** — both template test files guard on `fhevm.isMock` and `this.skip()`.
  - On Sepolia every encrypt/decrypt round-trips the real relayer/KMS: template Sepolia test sets `this.timeout(4 * 40000)` for a single increment test.
  - Coverage only in mock; `evm_snapshot`-based tests incompatible with coverage (archived v0.10 note).
  - The plugin's mainnet ops require a Zama API key: "To generate encrypted inputs or decrypt FHE data on Ethereum mainnet, you need a Zama API key … `npx hardhat vars set ZAMA_FHEVM_API_KEY`" (plugin README). Nothing equivalent is documented for Sepolia (see §4.4).
- Foundry alternative exists (`forge-fhevm`, sg-foundry.md): "deploys the **real** FHEVM host contracts (FHEVMExecutor, ACL, InputVerifier, KMSVerifier) inside Foundry's test environment, with mock signer keys" — Hardhat remains the primary documented path.

---

## 3. Deploying and testing on Sepolia

Sources: template README.md, sg-setup.md, sg-hardhat-run-test.md, `_repos/fhevm-hardhat-template/deploy/deploy.ts`, `test/FHECounterSepolia.ts`.

### 3.1 Prereqs

- `npx hardhat vars set MNEMONIC` and `npx hardhat vars set INFURA_API_KEY` (network URL is `https://sepolia.infura.io/v3/${INFURA_API_KEY}`; swap the URL in hardhat.config.ts for another RPC provider if desired).
- Fund the first derived account (`m/44'/60'/0'/0/0`) with **Sepolia ETH** (faucet). Docs: Sepolia mode "is slower and requires Sepolia ETH".
- Optional `npx hardhat vars set ETHERSCAN_API_KEY` for verification.

### 3.2 Deploy (hardhat-deploy)

`deploy/deploy.ts` verbatim:

```typescript
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedFHECounter = await deploy("FHECounter", {
    from: deployer,
    log: true,
  });

  console.log(`FHECounter contract: `, deployedFHECounter.address);
};
export default func;
func.id = "deploy_fheCounter"; // id required to prevent reexecution
func.tags = ["FHECounter"];
```

Commands (run_test.md prescribes a clean rebuild first):

```sh
npx hardhat clean
npx hardhat compile --network sepolia
npx hardhat deploy --network sepolia          # or: npm run deploy:sepolia
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>   # Etherscan verification
npx hardhat fhevm check-fhevm-compatibility --network sepolia --address <deployed contract address>
```

run_test.md: "If an internal exception is raised [by check-fhevm-compatibility], it likely means the contract was not properly compiled for the Sepolia network."

### 3.3 Tests against Sepolia

`npx hardhat test --network sepolia` (or `npm run test:sepolia`). The Sepolia suite (`test/FHECounterSepolia.ts`) pattern:

```typescript
before(async function () {
  if (fhevm.isMock) {
    console.warn(`This hardhat test suite can only run on Sepolia Testnet`);
    this.skip();
  }
  try {
    const FHECounterDeployement = await deployments.get("FHECounter");   // needs prior `hardhat deploy --network sepolia`
    fheCounterContractAddress = FHECounterDeployement.address;
    fheCounterContract = await ethers.getContractAt("FHECounter", FHECounterDeployement.address);
  } catch (e) {
    (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
    throw e;
  }
  ...
});

it("increment the counter by 1", async function () {
  this.timeout(4 * 40000);   // real relayer/KMS round-trips are slow
  const encryptedZero = await fhevm.createEncryptedInput(addr, alice.address).add32(0).encrypt();
  ...
  const clearCountAfterInc = await fhevm.userDecryptEuint(FhevmType.euint32, handle, addr, alice);
});
```

Exactly the same `fhevm.*` API as mock — the plugin routes to the real Sepolia relayer when `--network sepolia`. Interacting via tasks: `npx hardhat --network sepolia task:decrypt-count`, `task:increment --value 1`, `task:decrement --value 1` (tasks call `await fhevm.initializeCLIApi()` first).

Sepolia chain facts (from `_raw/solidity/smart-contract_configure_contract_addresses.md`): chainId **11155111**, gateway chainId **55815**, `RELAYER_URL = https://relayer.testnet.zama.org` (the archived v0.10 doc's `relayer.testnet.zama.cloud` is outdated).

---

## 4. Frontend — CURRENT `@zama-fhe/sdk` v3 (+ `@zama-fhe/react-sdk`)

Docs root: docs.zama.org/protocol/sdk (unversioned = current; `/sdk/alpha/` = prerelease channel for 3.3.0-alpha.x — label alpha content accordingly).

### 4.1 Packages & install (sdk-overview.md)

| Package | Use when... |
|---|---|
| `@zama-fhe/sdk` | vanilla TypeScript, Node.js, any non-React framework |
| `@zama-fhe/react-sdk` | React apps (hooks + `ZamaProvider`); peer-depends on `@zama-fhe/sdk` |

```sh
# React app
npm install @zama-fhe/react-sdk @zama-fhe/sdk @tanstack/react-query
# Vanilla TS / Node.js
npm install @zama-fhe/sdk
```

React apps MUST wrap `<ZamaProvider>` in a TanStack `QueryClientProvider` (hooks are TanStack-Query-based).

### 4.2 createConfig for Sepolia — verbatim (sdk-quick-start.md)

Chain presets from `@zama-fhe/sdk/chains`: `mainnet` (1), `sepolia` (11155111), `hoodi` (560048), `ingenTestnet` (364301), `bscTestnet` (97), `hardhat` (31337, alias `anvil`). Each `FheChain` preset carries `id, gatewayChainId, relayerUrl, network, aclContractAddress, kmsContractAddress, inputVerifierContractAddress, verifyingContractAddressDecryption, verifyingContractAddressInputVerification, registryAddress, executorAddress, auth, ...` — you never hand-enter contract addresses for Sepolia.

React + wagmi:

```tsx
import { WagmiProvider, createConfig, http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ZamaProvider } from "@zama-fhe/react-sdk";
import { web } from "@zama-fhe/sdk/web";
import { createConfig as createZamaConfig } from "@zama-fhe/react-sdk/wagmi";
import { sepolia as sepoliaFhe, type FheChain } from "@zama-fhe/sdk/chains";

const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [injected()],
  transports: { [sepolia.id]: http("https://sepolia.infura.io/v3/YOUR_KEY") },
});

const mySepolia = {
  ...sepoliaFhe,
  relayerUrl: "https://your-app.com/api/relayer/11155111",  // backend proxy (see 4.4)
} as const satisfies FheChain;

const zamaConfig = createZamaConfig({
  chains: [mySepolia],
  wagmiConfig,
  relayers: { [mySepolia.id]: web() },
});

const queryClient = new QueryClient();

function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ZamaProvider config={zamaConfig}>
          <MyTokenPage />
        </ZamaProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

Vanilla viem: `createConfig` from `@zama-fhe/sdk/viem` with `publicClient`/`walletClient`, then `const sdk = new ZamaSDK(config);`. Ethers browser: `createConfig` from `@zama-fhe/sdk/ethers` with `ethereum: window.ethereum!`. Node.js backend: `node({ poolSize: 4 })` relayer + `storage: memoryStorage` + direct RPC via `network` on the chain preset; call `sdk.terminate()` when done (cleans worker threads).

### 4.3 Relayer choice (sdk-configuration.md, verbatim table)

| Relayer | Environment | Description |
| --- | --- | --- |
| `web()` | Browser | Runs WASM in a Web Worker via CDN |
| `node()` | Node.js | Uses native worker threads |
| `cleartext()` | Local dev | No FHE infrastructure — cleartext operations |

```ts
import { cleartext } from "@zama-fhe/sdk";
import { web } from "@zama-fhe/sdk/web";
import { node } from "@zama-fhe/sdk/node";
```

"Chain-specific data (`relayerUrl`, `network`, `executorAddress`, etc.) comes from the chain preset. The relayer factory only accepts pool/worker options." Multiple chains can share one relayer instance (one `web()` call ⇒ one shared worker). `web({ threads: N })`: multi-threading needs COOP/COEP headers for SharedArrayBuffer; "Without these headers, the browser blocks SharedArrayBuffer and the relayer falls back to single-threaded mode"; sweet spot 4–8 threads (sdk-api-relayerweb.md). FHE artifacts (multi-MB key + params) are cached — browser IndexedDB (persists), Node memory (lost on restart), revalidated against the CDN every 24 h (sdk-quick-start.md hint, sdk-api-fheartifactcache.md).

### 4.4 Authentication, API keys, rate limits

- sdk-authentication.md: "**The relayer requires an API key for every request.**" Two strategies: **Backend proxy** (browser apps — key stays server-side; SDK's `relayerUrl` points to your proxy, proxy injects `x-api-key` header; complete Express example in the doc, verbatim in `_raw/tooling/sdk-authentication.md`) or **Direct API key** (server-side: `auth: { __type: "ApiKeyHeader" as const, value: process.env.RELAYER_API_KEY! }` on the `FheChain`).
- Auth methods: `ApiKeyHeader` (x-api-key header — the ONLY method the Zama-hosted relayer accepts; "requests without the `x-api-key` header are rejected"), `ApiKeyCookie` (your own proxy), `BearerToken` (self-hosted relayer).
- Getting a key (sdk-relayer-api-keys.md): "The Relayer API key provides secure access to Zama's hosted Relayer service **on mainnet**." Apply via form https://forms.gle/jq84zEek1oiv3kBz9; billed monthly by usage; self-hosting is the alternative. "Before publishing your solution on mainnet, ensure that end-to-end integration has been successfully tested on testnet."
- **Rate limits: NOT published.** ?ask answer: "I cannot find any published relayer rate limits in the docs available here." (`_raw/ask/ask-relayer-rate-limits.md`)
- **UNCERTAIN — does Sepolia require an API key?** Docs conflict:
  - ?ask on authentication.md (2×, this session): "Yes — the relayer requires an API key for every request", "This applies to the hosted relayer generally". But also: "I cannot find any docs page that defines a separate 'testnet key' flow" (`_raw/ask/ask-testnet-api-key.md`).
  - Earlier ?ask on the addresses page (`_raw/addresses-examples/ask-03-relayer-url.md`): "**Is an API key required? No.** The Sepolia testnet relayer is open, so the SDK presets (like `sepolia`) work with no `auth` configured. Only the Zama-hosted mainnet relayer requires an API key."
  - Supporting the "mainnet-only" reading: the API-key page and the hardhat-plugin README both scope the key to mainnet, and the SDK `sepolia` preset ships without `auth`.
  - **Practical guidance:** build the backend proxy anyway (correct in both worlds, and required for mainnet); try Sepolia without a key first and add `ApiKeyHeader` only if you get 401/403. relayer-sdk repo notes 401/403 relayer error messages are surfaced by the SDK (commit "fix: surface relayer/edge error messages on 401 and 403").

### 4.5 Encrypting inputs & decrypting for a CUSTOM contract (what a lending protocol uses)

The token-centric API (`sdk.createWrappedToken`, `shield/unshield/confidentialTransfer`, `useShield`, `useConfidentialBalance`, …) is for ERC-7984 wrapped tokens. For **your own FHE contract** (lending pool taking `externalEuint64` etc.) use the low-level hooks (sdk-api-useencrypt.md, verbatim): "Use `useEncrypt` when your smart contract uses FHE types directly (e.g. a confidential voting contract, a sealed-bid auction, or any non-token contract that accepts encrypted parameters)."

```tsx
import { useEncrypt } from "@zama-fhe/react-sdk";

const { mutateAsync: encrypt, isPending } = useEncrypt();

const { encryptedValues, inputProof } = await encrypt({
  values: [{ value: 1000n, type: "euint64" }],
  contractAddress: "0xContract",
  userAddress: "0xUser",
});
// encryptedValues[0] is the encrypted value (0x hex), inputProof is the ZK proof — both contract-ready
```

Supported types: `ebool, euint8..euint256, eaddress` (values as `bigint`, bool, or `0x…` address). Then call your contract: `writeContract({ ..., args: [encrypted.encryptedValues[0]!, encrypted.inputProof] })`.

Decryption hooks: `useDecryptValues(inputs, { enabled: true })` — user decryption via permit; **disabled by default** — takes `[{ encryptedValue, contractAddress }]`, results keyed by `encryptedValue`. `useDecryptPublicValues` — public decryption mutation (no permit). Gate decrypt UI on `useHasPermit` / `useGrantPermit` to avoid surprise wallet popups (permit = reusable EIP-712 signature granting decrypt rights for a set of contracts; the transport key pair is SDK-managed, chain-agnostic). Non-React: the same operations live on `ZamaSDK` (`sdk.provider.readContract` for reads; `sdk.signer` may be `undefined` when no wallet — guard it).

### 4.6 SSR / Next.js gotchas (sdk-nextjs-ssr.md)

- SDK needs Web Workers + IndexedDB + WASM — none exist during SSR. "You cannot import `RelayerWeb`, `ZamaProvider`, or any SDK hook in a Server Component"; "You cannot create the relayer or signer at module level in a file that runs on the server".
- Every component importing `@zama-fhe/react-sdk` must be `"use client"`. Put `ZamaProvider` (+ wagmi + QueryClientProvider) in a dedicated `app/providers.tsx` client component; the root layout (server) just nests it.
- Module-level `createConfig` in shared code crashes SSR; safe alternative is a dynamic-import factory (`await import("@zama-fhe/sdk")` inside a function).
- Client-side env vars need `NEXT_PUBLIC_` / `VITE_` prefixes (sdk-quick-start.md).

### 4.7 v2→v3 migration (sdk-migrate-v2-v3.md) — condensed symbol table (verbatim rows)

Applies to apps written against `@zama-fhe/sdk` **2.x**; the guide is designed to be executed by an AI coding agent (contains a full prompt). Core renames:

| 2.x | 3.x |
|---|---|
| `new ZamaSDK({ relayer, signer, storage })` | `new ZamaSDK(createConfig({ chains, …client, relayers, storage }))` |
| `SepoliaConfig` / `MainnetConfig` / `HardhatConfig` (from `@zama-fhe/sdk`) | `sepolia` / `mainnet` / `hardhat` (+ `hoodi`, `anvil`, …) from `@zama-fhe/sdk/chains` |
| `<chainConfig>.chainId` | `<chain>.id` |
| `new RelayerWeb(...)` / `new RelayerNode(...)` | `web()` from `@zama-fhe/sdk/web` / `node()` from `@zama-fhe/sdk/node`; *(new in v3)* `cleartext()` |
| `keypairTTL` | `transportKeyPairTTL` |
| `token.approve(spender)` / `token.isApproved(spender[, owner])` | `token.setOperator(operator)` / `token.isOperator(holder, spender)` ⚠ argument order reversed |
| `token.balanceOf()` (self default) | `token.balanceOf(owner)` — owner now required |
| `EncryptResult.handles` (bytes) | `EncryptResult.encryptedValues` (hex; `inputProof` hex too) |
| `useUserDecrypt({ handles })` | `useDecryptValues(inputs)` (positional array of `{ encryptedValue, contractAddress }`) |
| `usePublicDecrypt` | `useDecryptPublicValues` |
| `useAllow` / `useIsAllowed` | `useGrantPermit` / `useHasPermit` |
| `useConfidentialApprove` / `useConfidentialIsApproved` | `useConfidentialSetOperator` / `useConfidentialIsOperator` |
| `sdk.createReadonlyToken(addr)` / `ReadonlyToken` | `sdk.createToken(addr)` (`Token`) / `sdk.createWrappedToken(addr)` (`WrappedToken`) |
| Activity feed (`useActivityFeed`, …), `DecryptCache`, `applyDecryptedValues`, `extractEncryptedHandles` | **removed** |

---

## 5. LEGACY frontend SDK — `@zama-fhe/relayer-sdk` (label: legacy; v0.10-era docs)

Status: npm latest **0.4.4**, **not npm-deprecated**; repo `main` at `0.5.0-rc.1` (async POST+polling HTTP API — `.encrypt()/.userDecrypt()/.publicDecrypt()` gain an optional `options` param with `auth/signal/timeout/onProgress`, per `_repos/relayer-sdk/API_MIGRATION.md`). Docs call it "the legacy Relayer SDK"; it remains the low-level engine (the hardhat plugin peer-depends on it, and the plugin's `hre.fhevm.createInstance()` returns its `FhevmInstance`). If you build the frontend with plain ethers and want the smallest surface, this SDK still works; new work is steered to `@zama-fhe/sdk` v3.

### 5.1 Initialization (legacy-initialization.md, v0.10 archived — verbatim)

```ts
import { createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk";

const instance = await createInstance(SepoliaConfig);
```

or fully explicit (v0.10 addresses shown in the archived page; **current** Sepolia values live at solidity-guides/smart-contract/configure/contract_addresses — RELAYER_URL is now `https://relayer.testnet.zama.org`, gatewayChainId 55815, chainId 11155111):

```ts
const instance = await createInstance({
  aclContractAddress: "…", kmsContractAddress: "…", inputVerifierContractAddress: "…",
  verifyingContractAddressDecryption: "…", verifyingContractAddressInputVerification: "…",
  chainId: 11155111, gatewayChainId: 55815,
  network: "https://eth-sepolia.public.blastapi.io",
  relayerUrl: "https://relayer.testnet.zama.org",
});
```

Browser bundle requires WASM init first: `await initSDK();` then `createInstance({ ...SepoliaConfig, network: window.ethereum })`. Mainnet auth (repo docs/mainnet-api-key.md): `createInstance({ ...MainnetConfig, auth: { __type: 'ApiKeyHeader', value: ZAMA_FHEVM_API_KEY } })`.

### 5.2 Encrypted inputs (legacy-input.md — verbatim pattern)

```ts
const buffer = instance.createEncryptedInput(contractAddress, userAddress);
buffer.add64(BigInt(23393893233));
buffer.add64(BigInt(1));
// addBool/add8/add16/add32/add128/add256/addAddress also available
const ciphertexts = await buffer.encrypt();  // encrypts + ZK proof + uploads via relayer
my_contract.add(ciphertexts.handles[0], ciphertexts.handles[1], ciphertexts.inputProof);
```

Decryption: `instance.publicDecrypt(handles)` → `PublicDecryptResults` (same shape as §2.5); `instance.userDecrypt(handleContractPairs, privateKey, publicKey, signature, contractAddresses, userAddress, startTimestamp, durationDays)` with an EIP-712 signature from `instance.createEIP712(...)` + `instance.generateKeypair()`.

### 5.3 Packaging / CDN (repo package.json + legacy-webapp.md/legacy-webpack.md)

- Package exports: `@zama-fhe/relayer-sdk/web` (browser ESM), `/bundle` (prebundled — "recommend using our CDN" for SSR apps), `/node` (CJS+ESM). Deps include `tfhe`/`node-tfhe` 1.5.4, `tkms`/`node-tkms` 0.13.10.
- CDN (v0.10 docs show `0.2.0` paths — check for a current version before use): `<script src="https://cdn.zama.ai/relayer-sdk-js/0.2.0/relayer-sdk-js.umd.cjs">` or ESM `import { initSDK, createInstance, SepoliaConfig } from "https://cdn.zama.ai/relayer-sdk-js/0.2.0/relayer-sdk-js.js"`.
- Webpack fixes (legacy-webpack.md): `Can't resolve 'tfhe_bg.wasm'` → `resolve.fallback: { 'tfhe_bg.wasm': require.resolve('tfhe/tfhe_bg.wasm') }`; `Buffer is not defined` → browserify fallbacks (buffer, crypto-browserify, stream-browserify, path-browserify); SSR bundling issues → use `@zama-fhe/relayer-sdk/bundle`.
- CLI: package ships `bin/` tools (`npx @zama-fhe/relayer-sdk`-style CLI, legacy-cli.md) for encrypt/decrypt from the terminal.

---

## 6. Local dev loop for a dApp (frontend against a local chain)

Two distinct local paths — do not mix them up:

**A. Hardhat-node mock (contract-dev loop, plugin-driven).** `npx hardhat node` → `npx hardhat deploy --network localhost` → interact via hardhat tasks (`npx hardhat --network localhost task:decrypt-count` etc.). Persistent local chain with the plugin's mock FHEVM; ideal while iterating on the lending contracts + integration tests. (sg-hardhat-run-test.md, tasks/FHECounter.ts)

**B. SDK v3 `cleartext()` relayer (frontend-dev loop).** sdk-local-development.md: "The SDK ships a `cleartext()` relayer factory … replacing FHE operations with cleartext operations. Values are stored as plaintext on-chain — no KMS, no gateway, no WASM. Use it for local Hardhat nodes, custom testnets, or any chain where you deploy FHEVM contracts in cleartext mode." Same `RelayerSDK` interface as `web()`/`node()` so app code is unchanged.

```ts
import { createConfig } from "@zama-fhe/sdk/viem";
import { cleartext, ZamaSDK, memoryStorage } from "@zama-fhe/sdk";
import { hardhat } from "@zama-fhe/sdk/chains";

const config = createConfig({
  chains: [{ ...hardhat, executorAddress: "0xYourExecutorAddress" }],
  publicClient,
  walletClient,
  storage: memoryStorage,
  relayers: { [hardhat.id]: cleartext() },
});
const sdk = new ZamaSDK(config);
```

- "The `executorAddress` is the deployed `CleartextFHEVMExecutor` contract address from your Hardhat setup." Optional `kmsSignerPrivateKey` / `inputSignerPrivateKey` override the built-in mock EIP-712 signers.
- **"Cleartext mode is blocked on Ethereum Mainnet (chain 1) and Sepolia (chain 11155111). It is intended for development and testing only."**
- `requestZKProofVerification` throws `ConfigurationError` in cleartext mode (sdk-api-relayercleartext.md).
- **UNCERTAIN:** whether the `@fhevm/hardhat-plugin` mock node automatically exposes a `CleartextFHEVMExecutor` at the `hardhat` preset's `executorAddress`, or whether you must deploy FHEVM cleartext-mode contracts yourself — the docs do not connect the two toolchains explicitly (see questions-tooling.md).

Recommended lending-protocol loop: (1) contracts + tests in mock (`npx hardhat test`) including the §2.5 publicDecrypt/checkSignatures flow; (2) persistent local run (`hardhat node` + tasks / frontend on `cleartext()` if wired); (3) deploy + verify + `npx hardhat test --network sepolia`; (4) frontend on Sepolia with `@zama-fhe/sdk` v3 `web()` + backend relayer proxy.

---

## Sources

- Repos: `C:/Users/USER/desktop/zama/_repos/fhevm-hardhat-template` (commit ec84e1a), `C:/Users/USER/desktop/zama/_repos/relayer-sdk` (commit d06f1e5).
- Raw doc dumps: `C:/Users/USER/desktop/zama/zama-docs/_raw/tooling/*` (mapping in `_raw/tooling-manifest.md`), `_raw/decryption/oracle.md`, `_raw/decryption/heads-or-tails.md`, `_raw/solidity/smart-contract_configure_contract_addresses.md`, `_raw/ask/*`.
- Plugin API: `@fhevm/hardhat-plugin@0.4.2` `_types/types.d.ts` + `_types/internal/FhevmExternalAPI.d.ts` via unpkg; npm README via `npm view`.
- npm versions: `npm view` on 2026-07-03 (see §0).
