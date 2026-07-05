# Pitfalls — tooling (Hardhat template/plugin, Sepolia, frontend SDKs)

One bullet per warning/limitation, with source. Compiled 2026-07-03.

## Hardhat template / plugin / mock mode

- Mock tests cannot run on Sepolia and Sepolia tests cannot run in mock — always guard with `fhevm.isMock` + `this.skip()` (both template test files do). — `_repos/fhevm-hardhat-template/test/FHECounter.ts`, `test/FHECounterSepolia.ts`
- `awaitDecryptionOracle` does NOT exist in `@fhevm/hardhat-plugin@0.4.2` (not in shipped types, template, or current docs; ?ask: "I cannot find information about awaitDecryptionOracle"). The old v0.10 `FHE.requestDecryption`+callback oracle is replaced by `FHE.makePubliclyDecryptable` → off-chain `publicDecrypt` → `FHE.checkSignatures`. Don't copy older tutorials. — plugin `_types/types.d.ts`; `_raw/ask/ask-mock-public-decrypt.md`; `_raw/decryption/oracle.md`
- Decryption proof is bound to the ORDER of handles: proof for `[a, b]` fails for `[b, a]`; the i-th cleartext in `abi.encode` must match the i-th handle in `FHE.checkSignatures`. — `_raw/decryption/oracle.md`
- The `checkSignatures` "callback" function must implement its own replay protection (e.g. `require(winner == address(0))`); docs: "the callback should always verify the signatures and implement a replay protection mechanism". — `_raw/decryption/oracle.md`
- `userDecryptEuint/Ebool/Eaddress` fail unless BOTH the contract (`FHE.allowThis`) and the user (`FHE.allow(handle, user)`) have ACL permission. — `_raw/tooling/sg-hardhat-write-test.md` (warning box)
- Hardhat tasks must call `await fhevm.initializeCLIApi()` before using `fhevm.*`; tests must not. — `_repos/fhevm-hardhat-template/tasks/FHECounter.ts`
- Hardhat does not support odd-numbered Node.js versions (v21/v23 → warnings, misbehavior); Node >= 20 even LTS required. — `_raw/tooling/sg-setup.md`
- `@nomicfoundation/hardhat-chai-matchers` requires chai v4 (template pins `chai ^4.5.0`; don't bump to chai 5). — `@fhevm/hardhat-plugin` npm README; template package.json
- Template uses Hardhat 2.x (`^2.28.6`) + hardhat-deploy `^0.11.x`; Hardhat 3 is NOT what the template targets. — `_repos/fhevm-hardhat-template/package.json`
- Default `MNEMONIC`/`INFURA_API_KEY` fallbacks are "not suitable for real deployments" — set real values via `npx hardhat vars set …` (config uses hardhat vars, NOT `.env`). — `_raw/tooling/sg-setup.md`; hardhat.config.ts
- Coverage only works in mock mode, and `solidity-coverage` breaks on tests using `evm_snapshot` — tag them `[skip-on-coverage]`. — `_raw/tooling/v010-mocked.md` (v0.10, archived; coverage script still present in current template)
- `hre.fhevm.debugger.decrypt*` (and v0.10 `debug.decrypt[XX]`) bypass ACL and use private keys — mock/debug only, error in production environments. — plugin types; `_raw/tooling/v010-debug-decrypt.md` (v0.10, archived)
- Mock mode gives no realistic timing/HCU/latency; Sepolia round-trips are slow — the template's single Sepolia increment test sets `this.timeout(4 * 40000)`. — `test/FHECounterSepolia.ts`
- Before deploying/testing on Sepolia run `npx hardhat clean && npx hardhat compile --network sepolia`; a failing `npx hardhat fhevm check-fhevm-compatibility` "likely means the contract was not properly compiled for the Sepolia network". — `_raw/tooling/sg-hardhat-run-test.md`
- Sepolia tests require a PRIOR `npx hardhat deploy --network sepolia` (they resolve the address via `deployments.get(...)`) and a funded account (Sepolia ETH). — `test/FHECounterSepolia.ts`; `_raw/tooling/sg-hardhat-run-test.md`
- Plugin mainnet ops need `npx hardhat vars set ZAMA_FHEVM_API_KEY` ("To generate encrypted inputs or decrypt FHE data on Ethereum mainnet, you need a Zama API key") — scoped to mainnet, nothing documented for Sepolia. — `@fhevm/hardhat-plugin` npm README

## Relayer / API keys / rate limits

- Zama-hosted relayer accepts ONLY `ApiKeyHeader` (`x-api-key` header); `BearerToken`/`ApiKeyCookie` "are rejected at the edge". — `_raw/tooling/sdk-authentication.md`
- Never put the relayer API key in client-side code — browser dApps must proxy relayer traffic through a backend that injects `x-api-key` (Express example in the docs). — `_raw/tooling/sdk-authentication.md`, `sdk-relayer-api-keys.md`
- Relayer rate limits are NOT published anywhere in the docs (?ask confirmed). Budget for retries/backoff; the SDKs surface 401/403 relayer errors. — `_raw/ask/ask-relayer-rate-limits.md`; relayer-sdk commit d06f1e5
- CONFLICTING docs on whether Sepolia needs an API key: authentication guide says "requires an API key for every request" (+2 ?ask answers agree), but an addresses-page ?ask says "No — the Sepolia testnet relayer is open" and the API-key page/plugin README scope keys to mainnet. Try keyless on Sepolia; add the proxy regardless. — `_raw/ask/ask-testnet-api-key.md` vs `_raw/addresses-examples/ask-03-relayer-url.md`
- Current Sepolia RELAYER_URL is `https://relayer.testnet.zama.org`; the archived v0.10 page shows `relayer.testnet.zama.cloud` (outdated — don't copy). — `_raw/solidity/smart-contract_configure_contract_addresses.md` vs `_raw/tooling/legacy-initialization.md`
- Mainnet API key application is a Google form reviewed by Zama (billed monthly); test end-to-end on testnet before mainnet. — `_raw/tooling/sdk-relayer-api-keys.md`

## Frontend SDK v3 (@zama-fhe/sdk / react-sdk)

- SDK needs Web Worker + IndexedDB + WASM: never import `ZamaProvider`/hooks in a Next.js Server Component, and never `createConfig` at module level in code that runs during SSR (crashes) — keep it in a `"use client"` providers file or behind dynamic import. — `_raw/tooling/sdk-nextjs-ssr.md`
- `<ZamaProvider>` MUST be wrapped in a TanStack `QueryClientProvider` (hooks are TanStack-Query based). — `_raw/tooling/sdk-quick-start.md`, `sdk-migrate-v2-v3.md`
- `useDecryptValues` is disabled by default — pass `{ enabled: true }` or it never fires. — `_raw/tooling/sdk-migrate-v2-v3.md`
- Gate decrypt UI on `useHasPermit`/`useGrantPermit` or users get an unsolicited EIP-712 wallet popup on first render. — `_raw/tooling/sdk-migrate-v2-v3.md`
- `web({ threads: N })` multithreading requires COOP/COEP headers (SharedArrayBuffer); otherwise silently falls back to single-threaded. Sweet spot 4–8 threads. — `_raw/tooling/sdk-api-relayerweb.md`
- FHE artifacts are multi-MB; cached in IndexedDB (browser) but only in-memory for `node()` — lost on server restart unless you pass custom storage; CDN revalidation every 24 h. — `_raw/tooling/sdk-quick-start.md`, `sdk-api-fheartifactcache.md`
- `sdk.signer` can be `undefined` in v3 (read-only mode) — guard writes; reads go through `sdk.provider`. — `_raw/tooling/sdk-migrate-v2-v3.md`
- Call `sdk.terminate()` when done (Node) to clean up worker threads or the process may hang. — `_raw/tooling/sdk-quick-start.md`, `sdk-configuration.md`
- v2→v3 trap: `isApproved(spender, holder?)` → `isOperator(holder, spender)` — argument order REVERSED, compiles fine, silently wrong. — `_raw/tooling/sdk-migrate-v2-v3.md`
- v2→v3: `token.balanceOf()` self-default removed — `balanceOf(owner)` now requires the holder; hooks need explicit `account`. — `_raw/tooling/sdk-migrate-v2-v3.md`
- v2→v3: hook calling convention is MIXED (some positional `useX(address)`, some `{ address }`); the old `{ tokenAddress }` field is gone everywhere. — `_raw/tooling/sdk-migrate-v2-v3.md`
- LLMs routinely confuse `@zama-fhe/sdk` (high-level, current) with `@zama-fhe/relayer-sdk` (legacy low-level `createInstance`/`initSDK`) — treat the docs as source of truth, not model memory. — `_raw/tooling/sdk-migrate-v2-v3.md` (warning box)
- The v3 token API (shield/unshield/confidentialTransfer) is for ERC-7984 wrapped tokens; a custom lending contract needs `useEncrypt`/`useDecryptValues`(+`useDecryptPublicValues`) instead. — `_raw/tooling/sdk-api-useencrypt.md`
- Client-exposed env vars need `NEXT_PUBLIC_`/`VITE_` prefixes. — `_raw/tooling/sdk-quick-start.md`
- Importing viem's `sepolia` and `@zama-fhe/sdk/chains`' `sepolia` in one file collides — alias one of them. — `_raw/tooling/sdk-migrate-v2-v3.md`

## Local dev (cleartext) / legacy SDK

- `cleartext()` relayer is BLOCKED on chain IDs 1 and 11155111 — dev-only; values are stored as plaintext on-chain. — `_raw/tooling/sdk-local-development.md`, `sdk-api-relayercleartext.md`
- `requestZKProofVerification` throws `ConfigurationError` in cleartext mode. — `_raw/tooling/sdk-api-relayercleartext.md`
- cleartext mode requires a deployed `CleartextFHEVMExecutor` (`executorAddress` on the chain object); unclear if the hardhat-plugin mock node provides it (see questions). — `_raw/tooling/sdk-local-development.md`
- Legacy browser bundle: must `await initSDK()` (WASM load) before `createInstance`. — `_raw/tooling/legacy-webpack.md`, `legacy-webapp.md`
- Legacy webpack errors: `Can't resolve 'tfhe_bg.wasm'` → add resolve fallback to `tfhe/tfhe_bg.wasm`; `Buffer is not defined` → browserify polyfills; SSR bundling issues → use `@zama-fhe/relayer-sdk/bundle` or the CDN. — `_raw/tooling/legacy-webpack.md` (v0.10, archived)
- Legacy CDN snippet in archived docs pins `0.2.0` (`cdn.zama.ai/relayer-sdk-js/0.2.0/...`) while npm latest is 0.4.4 — verify the current CDN path before shipping. — `_raw/tooling/legacy-webapp.md` (v0.10, archived)
- relayer-sdk `main` (0.5.0-rc.1) is migrating the relayer HTTP API to async POST+polling; `.encrypt()`, `.userDecrypt()`, `.publicDecrypt()` gain an optional options param (`auth`, `signal`, `timeout`, `onProgress`). Pin 0.4.x for stability. — `_repos/relayer-sdk/API_MIGRATION.md`, package.json
