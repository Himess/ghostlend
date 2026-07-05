# Is there a maximum number of ciphertext handles that can be passed to a single publicDecrypt call, or a rate limit on public decryption requests to the relayer?

## Max handles per `publicDecrypt(...)` call

I cannot find any documented **maximum number of ciphertext handles** you can pass to a single SDK `publicDecrypt(handles)` call. The docs only state that the handles you pass must correspond to ciphertexts marked as publicly decryptable, and that **the proof is bound to the exact order** of the handles array: `[efoo, ebar]` ≠ `[ebar, efoo]`. See [Public Decryption](/protocol/solidity-guides/smart-contract/oracle.md).

## Rate limiting on public decryption requests to the relayer

For relayer-side throttling, the SDK surfaces it as `RelayerRequestFailedError` when the relayer HTTP request fails. On **rate-limited responses (HTTP 429)** it sets:

* `.retryable === true`
* `.retryAfter` = the server-provided suggested delay **in seconds** (when the `Retry-After` header is present)

See [Errors → `RelayerRequestFailedError`](/protocol/sdk/alpha/api-references/sdk/errors.md#relayerrequestfailederror).

**Important browser note:** because of CORS, `.retryAfter` (and sometimes `.statusCode`) may be unavailable in browser environments; then you should fall back to your own backoff strategy.

# Suggested Follow-up Questions:

If you need more information, consider asking one of these follow-up questions by performing an HTTP GET request on the URL:

- [How many handles can I pass?](https://docs.zama.org/protocol?ask=How%20many%20handles%20can%20I%20pass%3F&goal=Batch-decrypt%20epoch%20aggregates%20in%20a%20lending%20protocol%20on%20Sepolia)
- [Is there a documented max batch size?](https://docs.zama.org/protocol?ask=Is%20there%20a%20documented%20max%20batch%20size%3F&goal=Batch-decrypt%20epoch%20aggregates%20in%20a%20lending%20protocol%20on%20Sepolia)
- [What are relayer rate limits for Sepolia?](https://docs.zama.org/protocol?ask=What%20are%20relayer%20rate%20limits%20for%20Sepolia%3F&goal=Batch-decrypt%20epoch%20aggregates%20in%20a%20lending%20protocol%20on%20Sepolia)

# Sources:

- [Public Decryption](https://docs.zama.org/protocol/solidity-guides/smart-contract/oracle.md)
- [Errors](https://docs.zama.org/protocol/sdk/alpha/api-references/sdk/errors.md)
- [RelayerCleartext](https://docs.zama.org/protocol/sdk/alpha/api-references/sdk/relayercleartext.md)
- [Handles](https://docs.zama.org/protocol/solidity-guides/smart-contract/handles.md)
- [Decrypt values from event logs](https://docs.zama.org/protocol/sdk/alpha/guides/decrypt-from-event-logs.md)
- [Write FHEVM tests in Foundry](https://docs.zama.org/protocol/solidity-guides/development-guide/foundry/write_test.md)
- [Relayer API keys](https://docs.zama.org/protocol/sdk/guides/relayer-api-keys.md)
- [Error handling](https://docs.zama.org/protocol/solidity-guides/smart-contract/logics/error_handling.md)
- [useDecryptValues](https://docs.zama.org/protocol/sdk/api-references/react/usedecryptvalues.md)
- [Relayer API keys](https://docs.zama.org/protocol/sdk/alpha/guides/relayer-api-keys.md)

