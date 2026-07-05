# Is there a maximum number of ciphertext handles that can be passed to a single publicDecrypt call, or a rate limit on decryption requests to the relayer?

## Max ciphertext handles per `publicDecrypt` call

I can’t find any documented **maximum number of handles** you can pass to a single `publicDecrypt` call in the available docs.

What *is* specified: `publicDecrypt(handles)` takes a list of ciphertext handles, and `FHE.checkSignatures(handlesList, abiEncodedCleartexts, decryptionProof)` requires the **same number of elements** and a **matching order** between `handlesList` and the ABI-encoded cleartext array. See [Public Decryption](/protocol/solidity-guides/smart-contract/oracle.md).

## Rate limits on decryption requests to the relayer

Yes—your relayer calls can be **rate-limited**.

When calling the Zama hosted relayer, HTTP 429 responses surface as `RelayerRequestFailedError` (code `RELAYER_REQUEST_FAILED`). The docs recommend:

* Inspect `.statusCode`
* If it’s **429**, treat it as retryable
* **Wait `e.retryAfter` seconds** when provided (it’s taken from the server’s back-pressure hint), then retry

See [Handle errors](/protocol/sdk/alpha/guides/handle-errors.md) under `RelayerRequestFailedError`.

# Suggested Follow-up Questions:

If you need more information, consider asking one of these follow-up questions by performing an HTTP GET request on the URL:

- [How many handles per batch?](https://docs.zama.org/protocol?ask=How%20many%20handles%20per%20batch%3F&goal=Batch-decrypt%20epoch%20aggregates%20in%20a%20lending%20protocol)
- [What causes RELAYER_REQUEST_FAILED?](https://docs.zama.org/protocol?ask=What%20causes%20RELAYER_REQUEST_FAILED%3F&goal=Batch-decrypt%20epoch%20aggregates%20in%20a%20lending%20protocol)
- [How to retry after 429?](https://docs.zama.org/protocol?ask=How%20to%20retry%20after%20429%3F&goal=Batch-decrypt%20epoch%20aggregates%20in%20a%20lending%20protocol)

# Sources:

- [Handles](https://docs.zama.org/protocol/solidity-guides/smart-contract/handles.md)
- [Public Decryption](https://docs.zama.org/protocol/solidity-guides/smart-contract/oracle.md)
- [Reorgs handling](https://docs.zama.org/protocol/solidity-guides/smart-contract/acl/reorgs_handling.md)
- [Migrate from v2 to v3](https://docs.zama.org/protocol/sdk/migration/migrate-v2-to-v3.md)
- [Encrypt & decrypt](https://docs.zama.org/protocol/sdk/alpha/guides/encrypt-decrypt.md)
- [Decrypt values from event logs](https://docs.zama.org/protocol/sdk/alpha/guides/decrypt-from-event-logs.md)
- [Migrate from v2 to v3](https://docs.zama.org/protocol/sdk/alpha/migration/migrate-v2-to-v3.md)
- [Error handling](https://docs.zama.org/protocol/solidity-guides/smart-contract/logics/error_handling.md)
- [User decryption delegation](https://docs.zama.org/protocol/solidity-guides/smart-contract/acl/delegation.md)
- [Handle errors](https://docs.zama.org/protocol/sdk/alpha/guides/handle-errors.md)
- [Write FHEVM tests in Foundry](https://docs.zama.org/protocol/solidity-guides/development-guide/foundry/write_test.md)
- [useDecryptValues](https://docs.zama.org/protocol/sdk/api-references/react/usedecryptvalues.md)
- [useDecryptValues](https://docs.zama.org/protocol/sdk/alpha/api-references/react/usedecryptvalues.md)
- [useDecryptBalanceAs](https://docs.zama.org/protocol/sdk/alpha/api-references/react/usedecryptbalanceas.md)
- [Errors](https://docs.zama.org/protocol/sdk/alpha/api-references/sdk/errors.md)
- [Delegated decryption](https://docs.zama.org/protocol/sdk/guides/delegated-decryption.md)
- [Relayer API keys](https://docs.zama.org/protocol/sdk/guides/relayer-api-keys.md)
- [Delegated decryption](https://docs.zama.org/protocol/sdk/alpha/guides/delegated-decryption.md)
- [Relayer API keys](https://docs.zama.org/protocol/sdk/alpha/guides/relayer-api-keys.md)
- [Authentication](https://docs.zama.org/protocol/sdk/guides/authentication.md)

