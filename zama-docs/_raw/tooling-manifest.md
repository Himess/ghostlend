# Tooling raw-docs manifest (fetched 2026-07-03)

All files in `zama-docs/_raw/tooling/`. Every file verified to be raw markdown (no `<!DOCTYPE html`, no `global-error`). 44/44 fetches succeeded, 0 failures, 0 retries needed.

Version labels: **CURRENT** = unversioned docs path. **v0.10 (ARCHIVED)** = `/v0.10/` path — may describe an older protocol/SDK generation; use only where noted.

## Solidity guides — Hardhat / Foundry (CURRENT unless labeled)

| Local file | Source URL |
|---|---|
| sg-setup.md | https://docs.zama.org/protocol/solidity-guides/getting-started/setup.md |
| sg-setup-1.md | https://docs.zama.org/protocol/solidity-guides/getting-started/setup-1.md |
| sg-quickstart.md | https://docs.zama.org/protocol/solidity-guides/getting-started/quick-start-tutorial.md |
| sg-qs-write-simple.md | https://docs.zama.org/protocol/solidity-guides/getting-started/quick-start-tutorial/write_a_simple_contract.md |
| sg-qs-turn-fhevm.md | https://docs.zama.org/protocol/solidity-guides/getting-started/quick-start-tutorial/turn_it_into_fhevm.md |
| sg-qs-test.md | https://docs.zama.org/protocol/solidity-guides/getting-started/quick-start-tutorial/test_the_fhevm_contract.md |
| sg-hardhat.md | https://docs.zama.org/protocol/solidity-guides/development-guide/hardhat.md |
| sg-hardhat-write-test.md | https://docs.zama.org/protocol/solidity-guides/development-guide/hardhat/write_test.md |
| sg-hardhat-run-test.md | https://docs.zama.org/protocol/solidity-guides/development-guide/hardhat/run_test.md |
| sg-hardhat-write-task.md | https://docs.zama.org/protocol/solidity-guides/development-guide/hardhat/write_task.md |
| sg-foundry.md | https://docs.zama.org/protocol/solidity-guides/development-guide/foundry.md |
| sg-foundry-write-test.md | https://docs.zama.org/protocol/solidity-guides/development-guide/foundry/write_test.md |
| sg-foundry-deploy.md | https://docs.zama.org/protocol/solidity-guides/development-guide/foundry/deploy.md |
| sg-foundry-api.md | https://docs.zama.org/protocol/solidity-guides/development-guide/foundry/api.md |
| v010-mocked.md **(v0.10 ARCHIVED)** | https://docs.zama.org/protocol/solidity-guides/v0.10/docs/solidity-guides/mocked.md |
| v010-debug-decrypt.md **(v0.10 ARCHIVED)** | https://docs.zama.org/protocol/solidity-guides/v0.10/docs/solidity-guides/debug_decrypt.md |

## New TypeScript SDK — @zama-fhe/sdk v3 (all CURRENT)

| Local file | Source URL |
|---|---|
| sdk-overview.md | https://docs.zama.org/protocol/sdk/overview.md |
| sdk-quick-start.md | https://docs.zama.org/protocol/sdk/getting-started/quick-start.md |
| sdk-first-dapp.md | https://docs.zama.org/protocol/sdk/getting-started/first-confidential-dapp.md |
| sdk-wallet-exchange.md | https://docs.zama.org/protocol/sdk/getting-started/wallet-exchange-integration.md |
| sdk-build-with-llm.md | https://docs.zama.org/protocol/sdk/getting-started/build-with-an-llm.md |
| sdk-migrate-v2-v3.md | https://docs.zama.org/protocol/sdk/migration/migrate-v2-to-v3.md |
| sdk-configuration.md | https://docs.zama.org/protocol/sdk/guides/configuration.md |
| sdk-authentication.md | https://docs.zama.org/protocol/sdk/guides/authentication.md |
| sdk-relayer-api-keys.md | https://docs.zama.org/protocol/sdk/guides/relayer-api-keys.md |
| sdk-handle-errors.md | https://docs.zama.org/protocol/sdk/guides/handle-errors.md |
| sdk-node-backend.md | https://docs.zama.org/protocol/sdk/guides/node-js-backend.md |
| sdk-local-development.md | https://docs.zama.org/protocol/sdk/guides/local-development.md |
| sdk-nextjs-ssr.md | https://docs.zama.org/protocol/sdk/guides/nextjs-ssr.md |
| sdk-api-sdk.md | https://docs.zama.org/protocol/sdk/api-references/sdk.md |
| sdk-api-zamasdk.md | https://docs.zama.org/protocol/sdk/api-references/sdk/zamasdk.md |
| sdk-api-network-presets.md | https://docs.zama.org/protocol/sdk/api-references/sdk/network-presets.md |
| sdk-api-relayerweb.md | https://docs.zama.org/protocol/sdk/api-references/sdk/relayerweb.md |
| sdk-api-relayernode.md | https://docs.zama.org/protocol/sdk/api-references/sdk/relayernode.md |
| sdk-api-relayercleartext.md | https://docs.zama.org/protocol/sdk/api-references/sdk/relayercleartext.md |
| sdk-api-fheartifactcache.md | https://docs.zama.org/protocol/sdk/api-references/sdk/fheartifactcache.md |
| sdk-api-react.md | https://docs.zama.org/protocol/sdk/api-references/react.md |
| sdk-api-zamaprovider.md | https://docs.zama.org/protocol/sdk/api-references/react/zamaprovider.md |
| sdk-api-useencrypt.md | https://docs.zama.org/protocol/sdk/api-references/react/useencrypt.md |

## Legacy relayer-sdk guides (all v0.10 ARCHIVED / LEGACY)

| Local file | Source URL |
|---|---|
| legacy-initialization.md | https://docs.zama.org/protocol/solidity-guides/v0.10/docs/sdk-guides/initialization.md |
| legacy-input.md | https://docs.zama.org/protocol/solidity-guides/v0.10/docs/sdk-guides/input.md |
| legacy-webapp.md | https://docs.zama.org/protocol/solidity-guides/v0.10/docs/sdk-guides/webapp.md |
| legacy-webpack.md | https://docs.zama.org/protocol/solidity-guides/v0.10/docs/sdk-guides/webpack.md |
| legacy-cli.md | https://docs.zama.org/protocol/solidity-guides/v0.10/docs/sdk-guides/cli.md |

## ?ask responses (doc-grounded Q&A, saved under `zama-docs/_raw/ask/`)

| Local file | Question |
|---|---|
| ask-relayer-rate-limits.md | Relayer rate limits / API key required on Sepolia? (asked on sdk/guides/relayer-api-keys.md) |
| ask-mock-public-decrypt.md | Testing async public decryption + FHE.checkSignatures in mock mode; is awaitDecryptionOracle still available? (asked on hardhat/run_test.md) |
| ask-testnet-api-key.md | Is an API key needed for relayer.testnet.zama.org; how to get a testnet key? (asked on sdk/guides/authentication.md) |

## Repos cloned (shallow) under `C:/Users/USER/desktop/zama/_repos/`

| Repo | Commit | Notes |
|---|---|---|
| fhevm-hardhat-template | ec84e1aa1b0a3ef61d9795ef8bf367115b79272f (2026-05-04) | template v0.4.1 |
| relayer-sdk | d06f1e585a78181135cb602109e5fa3da523b48d (2026-06-16) | package.json version 0.5.0-rc.1 |

## Supplementary (scratchpad, quoted in 04-tooling.md)

- `@fhevm/hardhat-plugin@0.4.2` npm README and type declarations fetched via `npm view` / unpkg (`_types/types.d.ts`, `_types/internal/FhevmExternalAPI.d.ts`) — quoted verbatim in 04-tooling.md section 2.3.
