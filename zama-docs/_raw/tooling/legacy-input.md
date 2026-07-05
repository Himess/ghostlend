> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/sdk-guides/input.md).

# Input registration

This document explains how to register ciphertexts to the FHEVM. Registering ciphertexts to the FHEVM allows for future use on-chain using the `FHE.fromExternal` solidity function. All values encrypted for use with the FHEVM are encrypted under a public key of the protocol.

```ts
// We first create a buffer for values to encrypt and register to the fhevm
const buffer = instance.createEncryptedInput(
  // The address of the contract allowed to interact with the "fresh" ciphertexts
  contractAddress,
  // The address of the entity allowed to import ciphertexts to the contract at `contractAddress`
  userAddress,
);

// We add the values with associated data-type method
buffer.add64(BigInt(23393893233));
buffer.add64(BigInt(1));
// buffer.addBool(false);
// buffer.add8(BigInt(43));
// buffer.add16(BigInt(87));
// buffer.add32(BigInt(2339389323));
// buffer.add128(BigInt(233938932390));
// buffer.addAddress('0xa5e1defb98EFe38EBb2D958CEe052410247F4c80');
// buffer.add256(BigInt('2339389323922393930'));

// This will encrypt the values, generate a proof of knowledge for it, and then upload the ciphertexts using the relayer.
// This action will return the list of ciphertext handles.
const ciphertexts = await buffer.encrypt();
```

With a contract `MyContract` that implements the following it is possible to add two "fresh" ciphertexts.

```solidity
contract MyContract {
  ...

  function add(
    externalEuint64 a,
    externalEuint64 b,
    bytes calldata proof
  ) public virtual returns (euint64) {
    return FHE.add(FHE.fromExternal(a, proof), FHE.fromExternal(b, proof))
  }
}
```

With `my_contract` the contract in question using `ethers` it is possible to call the add function as following.

```js
my_contract.add(ciphertexts.handles[0], ciphertexts.handles[1], ciphertexts.inputProof);
```


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/solidity-guides/v0.10/docs/sdk-guides/input.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
