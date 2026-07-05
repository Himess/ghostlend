# Can any address submit the cleartext and decryption proof to the contract function that calls FHE.checkSignatures, and what prevents an attacker from submitting spoofed cleartext values?

## Who can submit cleartext + decryption proof?

Yes. In the **public decryption** workflow, once the contract calls `FHE.makePubliclyDecryptable(...)`, **any address** can submit the **cleartext** and the **KMS decryption proof** back on-chain through the contract function that calls `FHE.checkSignatures(...)`. The verification happens inside `FHE.checkSignatures`, and it **reverts** the transaction if the proof is not valid.

See: [Public Decryption](/protocol/solidity-guides/smart-contract/oracle.md) (3-step async workflow) and `FHE.checkSignatures` behavior in [FHEVM API reference](/protocol/solidity-guides/smart-contract/functions.md).

## What prevents spoofed cleartext values?

`FHE.checkSignatures` cryptographically binds the submission to the authentic decryption result:

* It verifies the provided `decryptionProof` and **reverts** if the proof is empty/invalid length, if valid signatures are below the KMS threshold, or if any signature is from a non-registered KMS signer.
* It also enforces that the `handlesList` **order matches** the order used off-chain when computing the proof; otherwise the proof won’t validate for the submitted cleartexts.

So an attacker can’t “invent” cleartext values—**they need a proof that verifies for those exact handles + cleartext bytes**, or the call reverts.

One caveat: `checkSignatures` **does not provide replay protection by itself**; the consuming contract should add its own “finalize once” / state guard.

# Suggested Follow-up Questions:

If you need more information, consider asking one of these follow-up questions by performing an HTTP GET request on the URL:

- [Does public decryption require a specific ACL setup?](https://docs.zama.org/protocol?ask=Does%20public%20decryption%20require%20a%20specific%20ACL%20setup%3F&goal=Secure%20the%20decryption%20finalization%20of%20a%20lending%20protocol)
- [How is order binding enforced in proofs?](https://docs.zama.org/protocol?ask=How%20is%20order%20binding%20enforced%20in%20proofs%3F&goal=Secure%20the%20decryption%20finalization%20of%20a%20lending%20protocol)
- [What replay protections should I add on-chain?](https://docs.zama.org/protocol?ask=What%20replay%20protections%20should%20I%20add%20on-chain%3F&goal=Secure%20the%20decryption%20finalization%20of%20a%20lending%20protocol)

# Sources:

- [Public Decryption](https://docs.zama.org/protocol/solidity-guides/smart-contract/oracle.md)
- [Write FHEVM tests in Foundry](https://docs.zama.org/protocol/solidity-guides/development-guide/foundry/write_test.md)
- [FHEVM API reference](https://docs.zama.org/protocol/solidity-guides/smart-contract/functions.md)
- [forge-fhevm API reference](https://docs.zama.org/protocol/solidity-guides/development-guide/foundry/api.md)
- [Contract addresses](https://docs.zama.org/protocol/solidity-guides/smart-contract/configure/contract_addresses.md)
- [Encrypt & decrypt](https://docs.zama.org/protocol/sdk/guides/encrypt-decrypt.md)
- [Tutorial](https://docs.zama.org/protocol/examples/auctions/sealed-bid-auction/sealed-bid-auction-tutorial.md)
- [Public Decrypt single value](https://docs.zama.org/protocol/examples/basic/decryption/heads-or-tails.md)
- [Contract addresses](https://docs.zama.org/protocol/protocol-apps/addresses.md)
- [How to Transform Your Smart Contract into a FHEVM Smart Contract?](https://docs.zama.org/protocol/solidity-guides/development-guide/transform_smart_contract_with_fhevm.md)

