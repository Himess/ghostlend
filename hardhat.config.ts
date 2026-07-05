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
import * as fs from "fs";
import * as path from "path";

import "./tasks/accounts";
import "./tasks/FHECounter";

// ---------------------------------------------------------------------------
// PROBE run configuration (Day-0 Sepolia probes).
// Signer = a raw private key (the funded probe wallet) loaded from, in order:
//   1. env PROBE_PK
//   2. probe/secrets.json { "privateKey": "0x..." }  (git-ignored)
//   3. hardhat vars PROBE_PK
// RPC = env SEPOLIA_RPC_URL | secrets.json.sepoliaRpcUrl | public node default.
// This deviates from the template's MNEMONIC/INFURA convention because the
// user supplied a single private key; the key is kept out of git via .gitignore.
// ---------------------------------------------------------------------------
type Secrets = { privateKey?: string; sepoliaRpcUrl?: string };
let fileSecrets: Secrets = {};
try {
  const p = path.join(__dirname, "probe", "secrets.json");
  if (fs.existsSync(p)) fileSecrets = JSON.parse(fs.readFileSync(p, "utf8")) as Secrets;
} catch {
  /* ignore malformed/missing secrets file */
}

const PROBE_PK: string = process.env.PROBE_PK || fileSecrets.privateKey || vars.get("PROBE_PK", "");
const SEPOLIA_RPC_URL: string =
  process.env.SEPOLIA_RPC_URL ||
  fileSecrets.sepoliaRpcUrl ||
  vars.get("SEPOLIA_RPC_URL", "https://ethereum-sepolia-rpc.publicnode.com");

const MNEMONIC: string = vars.get("MNEMONIC", "test test test test test test test test test test test junk");

const sepoliaAccounts = PROBE_PK
  ? [PROBE_PK.startsWith("0x") ? PROBE_PK : `0x${PROBE_PK}`]
  : { mnemonic: MNEMONIC, path: "m/44'/60'/0'/0/", count: 10 };

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  namedAccounts: {
    deployer: 0,
  },
  etherscan: {
    // Single-key string → hardhat-verify uses the Etherscan API **V2** multichain endpoint
    // (the per-network object form targets the deprecated V1 API).
    apiKey: vars.get("ETHERSCAN_API_KEY", ""),
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
    sepolia: {
      accounts: sepoliaAccounts,
      chainId: 11155111,
      url: SEPOLIA_RPC_URL,
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
        bytecodeHash: "none",
      },
      optimizer: {
        enabled: true,
        runs: 800,
      },
      // FHE-heavy functions (borrow/withdraw clamp chains) overflow the stack; IR pipeline fixes it.
      viaIR: true,
      evmVersion: "cancun",
    },
  },
  typechain: {
    outDir: "types",
    target: "ethers-v6",
  },
};

export default config;
