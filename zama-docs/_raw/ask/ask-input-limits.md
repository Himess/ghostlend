# What is the maximum number of encrypted values that can be packed into a single encrypted input proof (one createEncryptedInput call), and what is the maximum total bit size? Are there limits on the number of handles or total bits per input proof?

There’s **no documented numeric maximum** in the accessible docs for either:

* **Max number of encrypted values** you can pack into a **single** `createEncryptedInput(...).encrypt()` / `input.encrypt()` call
* **Max total bit size** of the resulting shared **`inputProof`** (or proof+handles payload)

## What the docs do confirm

### Multiple values per single encrypted input proof

* `useEncrypt` returns **`encryptedValues[]`** (one per plaintext input) and a **single shared `inputProof`** for the whole batch.\
  See [`useEncrypt`](/protocol/sdk/alpha/api-references/react/useencrypt.md) and the **Encrypt & decrypt** guide’s multi-value example: `result.inputProof` is shared.
* In the Hardhat/FHEVM flow, `createEncryptedInput(...).add*...encrypt()` produces:
  * **`enc.handles[]`** — one handle per added value
  * **`enc.inputProof`** — the shared ZK proof submitted alongside those handles\
    See [`Encrypted inputs`](/protocol/solidity-guides/smart-contract/inputs.md) and the **Encrypt multiple values** example: `enc.handles[0..2]` + `enc.inputProof`.

### Packing concept

Docs state encrypted inputs are **efficiently packed** so all inputs for a transaction go into a **single** packed submission/proof. [`Encrypted inputs`](/protocol/solidity-guides/smart-contract/inputs.md)

## Limits on handles / total bits

The docs explain that handles exist and are indexed in the proof, but they **do not specify**:

* a maximum number of handles per input proof, or
* a maximum proof size / total bits per input proof.

So from the accessible material: **the limits are not documented**.

# Suggested Follow-up Questions:

If you need more information, consider asking one of these follow-up questions by performing an HTTP GET request on the URL:

- [Are there any practical workarounds for large input batches?](https://docs.zama.org/protocol?ask=Are%20there%20any%20practical%20workarounds%20for%20large%20input%20batches%3F)
- [How is the packing order determined for multiple inputs?](https://docs.zama.org/protocol?ask=How%20is%20the%20packing%20order%20determined%20for%20multiple%20inputs%3F)
- [Where can I find any hidden limits in code samples?](https://docs.zama.org/protocol?ask=Where%20can%20I%20find%20any%20hidden%20limits%20in%20code%20samples%3F)

# Sources:

- [Encrypt & decrypt](https://docs.zama.org/protocol/sdk/guides/encrypt-decrypt.md)
- [Encrypt multiple values](https://docs.zama.org/protocol/examples/basic/encryption/fhe-encrypt-multiple-values.md)
- [Encrypted inputs](https://docs.zama.org/protocol/solidity-guides/smart-contract/inputs.md)
- [Encrypt single value](https://docs.zama.org/protocol/examples/basic/encryption/fhe-encrypt-single-value.md)
- [useEncrypt](https://docs.zama.org/protocol/sdk/alpha/api-references/react/useencrypt.md)
- [Decrypt values from event logs](https://docs.zama.org/protocol/sdk/alpha/guides/decrypt-from-event-logs.md)
- [useDecryptValues](https://docs.zama.org/protocol/sdk/api-references/react/usedecryptvalues.md)
- [useDecryptValues](https://docs.zama.org/protocol/sdk/alpha/api-references/react/usedecryptvalues.md)
- [Confidential wrapper](https://docs.zama.org/protocol/protocol-apps/confidential-tokens/confidential-wrapper.md)
- [Generate random numbers](https://docs.zama.org/protocol/solidity-guides/smart-contract/operations/random.md)
- [Operations on encrypted types](https://docs.zama.org/protocol/solidity-guides/smart-contract/operations.md)
- [Security model](https://docs.zama.org/protocol/sdk/alpha/concepts/security-model.md)
- [Public Decryption](https://docs.zama.org/protocol/solidity-guides/smart-contract/oracle.md)
- [Security model](https://docs.zama.org/protocol/sdk/concepts/security-model.md)
- [HCU](https://docs.zama.org/protocol/solidity-guides/development-guide/hcu.md)
- [Migrate from v2 to v3](https://docs.zama.org/protocol/sdk/alpha/migration/migrate-v2-to-v3.md)
- [Handles](https://docs.zama.org/protocol/solidity-guides/smart-contract/handles.md)
- [Error handling](https://docs.zama.org/protocol/solidity-guides/smart-contract/logics/error_handling.md)
- [Handle errors](https://docs.zama.org/protocol/sdk/alpha/guides/handle-errors.md)
- [Reorgs handling](https://docs.zama.org/protocol/solidity-guides/smart-contract/acl/reorgs_handling.md)
- [forge-fhevm API reference](https://docs.zama.org/protocol/solidity-guides/development-guide/foundry/api.md)
- [Public Decrypt single value](https://docs.zama.org/protocol/examples/basic/decryption/heads-or-tails.md)
- [Coprocessor](https://docs.zama.org/protocol/protocol/overview/coprocessor.md)
- [Write FHEVM tests in Foundry](https://docs.zama.org/protocol/solidity-guides/development-guide/foundry/write_test.md)
- [KMS](https://docs.zama.org/protocol/protocol/overview/kms.md)

