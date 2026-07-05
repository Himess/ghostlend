// Shared probe helpers: verified addresses, minimal ABIs, and fragment/state IO.
// All addresses verified as live contracts on Sepolia (probe P0, 2026-07-04).
import * as fs from "fs";
import * as path from "path";

export const OUT_DIR = path.join(__dirname, "out");

export const ADDR = {
  cUSDC: {
    wrapper: "0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639",
    underlying: "0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF",
  },
  cWETH: {
    wrapper: "0x46208622DA27d91db4f0393733C8BA082ed83158",
    underlying: "0xff54739b16576FA5402F211D0b938469Ab9A5f3F",
  },
  registry: "0x2f0750Bbb0A246059d80e94c454586a7F27a128e",
  acl: "0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D",
  hcu: "0xa10998783c8CF88D886Bc30307e631D6686F0A22",
  kms: "0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A",
  chainlink: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
  // shared wrapper implementation both cUSDC & cWETH proxies point at (P0)
  wrapperImpl: "0x390aa02fb7eba565bfcfc43f67db7e4d05c1d0ee",
};

// euint64 / externalEuint64 are bytes32 at the ABI boundary.
export const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function mint(address to, uint256 amount)",
  "function mint(uint256 amount)",
];

export const WRAPPER_ABI = [
  // IERC7984 core
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function confidentialTotalSupply() view returns (bytes32)",
  "function confidentialBalanceOf(address account) view returns (bytes32)",
  "function isOperator(address holder, address spender) view returns (bool)",
  "function setOperator(address operator, uint48 until)",
  "function confidentialTransfer(address to, bytes32 encryptedAmount, bytes inputProof) returns (bytes32 transferred)",
  "function confidentialTransfer(address to, bytes32 amount) returns (bytes32 transferred)",
  "function confidentialTransferFrom(address from, address to, bytes32 encryptedAmount, bytes inputProof) returns (bytes32 transferred)",
  "function confidentialTransferFrom(address from, address to, bytes32 amount) returns (bytes32 transferred)",
  // ERC7984ERC20Wrapper extras
  "function rate() view returns (uint256)",
  "function underlying() view returns (address)",
  "function wrap(address to, uint256 amount) returns (bytes32)",
  // events
  "event Wrap(address indexed to, uint256 roundedAmount, bytes32 encryptedWrappedAmount)",
  "event OperatorSet(address indexed holder, address indexed operator, uint48 until)",
  "event ConfidentialTransfer(address indexed from, address indexed to, bytes32 indexed amount)",
  "event AmountDisclosed(bytes32 indexed encryptedAmount, uint64 amount)",
  // candidate custom errors (for revert decoding)
  "error ERC7984ZeroBalance(address holder)",
  "error ERC7984UnauthorizedSpender(address holder, address spender)",
  "error ERC7984UnauthorizedUseOfEncryptedAmount(bytes32 amount, address user)",
  "error ERC7984InvalidReceiver(address receiver)",
  "error ERC7984InvalidSender(address sender)",
];

export const REGISTRY_ABI = [
  "function getConfidentialTokenAddress(address erc20) view returns (bool isValid, address confidentialToken)",
  "function isConfidentialTokenValid(address confidentialToken) view returns (bool)",
];

export const CHAINLINK_ABI = [
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function decimals() view returns (uint8)",
  "function description() view returns (string)",
  "function version() view returns (uint256)",
];

// candidate version getters used by Zama host contracts
export const VERSIONED_ABI = [
  "function getVersion() view returns (string)",
  "function version() view returns (string)",
];

export function ensureOut() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
}

export function writeFragment(name: string, content: string) {
  ensureOut();
  fs.writeFileSync(path.join(OUT_DIR, `${name}.md`), content, "utf8");
  console.log(`\n[fragment written: probe/out/${name}.md]`);
}

const STATE_FILE = () => path.join(OUT_DIR, "state.json");

export function readState(): Record<string, any> {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE(), "utf8"));
  } catch {
    return {};
  }
}

export function writeState(patch: Record<string, any>) {
  ensureOut();
  const s = { ...readState(), ...patch };
  fs.writeFileSync(STATE_FILE(), JSON.stringify(s, null, 2), "utf8");
}

export function fmtErr(e: any): string {
  const parts: string[] = [];
  if (e?.shortMessage) parts.push(e.shortMessage);
  else if (e?.message) parts.push(String(e.message).split("\n")[0]);
  if (e?.data && typeof e.data === "string") parts.push(`data=${e.data}`);
  if (e?.info?.error?.message) parts.push(`rpc=${e.info.error.message}`);
  if (e?.revert?.name) parts.push(`revert=${e.revert.name}(${(e.revert.args || []).join(",")})`);
  return parts.join(" | ") || String(e);
}
