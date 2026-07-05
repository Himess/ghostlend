# When packing multiple values with createEncryptedInput or the SDK encrypt builder, is there a maximum number of variables per input proof or a maximum total encrypted bit size per input ciphertext (for example 256 variables or 2048 bits)? What limits apply?

Yes — limits exist, and they come from the **compact input list** (the `inputProof` blob) and the **CRS** used to generate/verifiy the ZK proof.

## Max number of packed values (variables) per `inputProof`

When you pack multiple values with `createEncryptedInput` / the SDK encrypt builder, those values are stored in a **compact list** inside the single `bytes inputProof`.

On the coprocessor backend, the flag `--maximum-handles-per-input` sets the limit on how many compact-list entries you can include in one input:

* **`maximum-handles-per-input` default: `255`**\
  See [Inputs → Compact Input Lists](/protocol/solidity-guides/v0.10/coprocessor/docs/fundamentals/fhevm/inputs.md) and coprocessor config [Configuration](/protocol/solidity-guides/v0.10/coprocessor/docs/getting_started/fhevm/coprocessor/configuration.md).

So “256 variables” would exceed the documented default; **255 is the documented ceiling**.

## Max total encrypted bit size per packed proof

The ZK proof is generated using a **CRS** with a configured maximum provable bit size:

* `max-num-bits` in CRS generation specifies **the maximum number of bits provable with a given CRS**
* it is **usually `2048`** because that matches the largest supported data-type\
  See [Request the creation of a new private key](/protocol/solidity-guides/v0.10/coprocessor/docs/getting_started/tkms/create.md).

The Gateway also exposes CRSs keyed by that “max amount of bits” value in `/keys` response. See [Gateway API Specifications](/protocol/solidity-guides/v0.10/coprocessor/docs/references/gateway_api.md).

## Additional (batch) upload limit

Separately, the coprocessor has:

* **`--maximimum-compact-inputs-upload` default: `10`**\
  This is about how many compact inputs you upload, not the size/handles inside one `inputProof`. See [Configuration](/protocol/solidity-guides/v0.10/coprocessor/docs/getting_started/fhevm/coprocessor/configuration.md).

# Suggested Follow-up Questions:

If you need more information, consider asking one of these follow-up questions by performing an HTTP GET request on the URL:

- [What is the exact max handles per input?](https://docs.zama.org/protocol?ask=What%20is%20the%20exact%20max%20handles%20per%20input%3F)
- [Where to find max-num-bits CRS docs?](https://docs.zama.org/protocol?ask=Where%20to%20find%20max-num-bits%20CRS%20docs%3F)
- [Can I increase the compact-inputs-upload limit?](https://docs.zama.org/protocol?ask=Can%20I%20increase%20the%20compact-inputs-upload%20limit%3F)

# Sources:

- [Encrypted inputs](https://docs.zama.org/protocol/solidity-guides/smart-contract/inputs.md)
- [Encrypted inputs](https://docs.zama.org/protocol/solidity-guides/v0.11/smart-contract/inputs.md)
- [Inputs](https://docs.zama.org/protocol/solidity-guides/v0.10/coprocessor/docs/fundamentals/fhevm/inputs.md)
- [Confidential wrapper](https://docs.zama.org/protocol/protocol-apps/confidential-tokens/confidential-wrapper.md)
- [Inclusion Proof](https://docs.zama.org/protocol/solidity-guides/v0.10/coprocessor/docs/fundamentals/gateway/proof.md)
- [Homomorphic Complexity Units ("HCU") in FHEVM](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/solidity-guides/hcu.md)
- [useEncrypt](https://docs.zama.org/protocol/sdk/api-references/react/useencrypt.md)
- [Input registration](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/sdk-guides/input.md)
- [Configuration](https://docs.zama.org/protocol/solidity-guides/v0.10/coprocessor/docs/getting_started/fhevm/coprocessor/configuration.md)
- [Gateway API Specifications](https://docs.zama.org/protocol/solidity-guides/v0.10/coprocessor/docs/references/gateway_api.md)
- [Request the creation of a new private key](https://docs.zama.org/protocol/solidity-guides/v0.10/coprocessor/docs/getting_started/tkms/create.md)
- [HCU](https://docs.zama.org/protocol/solidity-guides/v0.11/development-guide/hcu.md)

