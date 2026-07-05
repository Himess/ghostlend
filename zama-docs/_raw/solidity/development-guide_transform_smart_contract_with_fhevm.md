> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/solidity-guides/development-guide/transform_smart_contract_with_fhevm.md).

# How to Transform Your Smart Contract into a FHEVM Smart Contract?

This short guide will walk you through converting a standard Solidity contract into one that leverages Fully Homomorphic Encryption (FHE) using FHEVM. This approach lets you develop your contract logic as usual, then adapt it to support encrypted computation for privacy.

For this guide, we will focus on a voting contract example.

***

## 1. Start with a Standard Solidity Contract

Begin by writing your voting contract in Solidity as you normally would. Focus on implementing the core logic and functionality.

```solidity
// Standard Solidity voting contract example
pragma solidity ^0.8.0;

contract SimpleVoting {
    mapping(address => bool) public hasVoted;
    uint64 public yesVotes;
    uint64 public noVotes;
    uint256 public voteDeadline;

    function vote(bool support) public {
        require(block.timestamp <= voteDeadline, "Too late to vote");
        require(!hasVoted[msg.sender], "Already voted");
        hasVoted[msg.sender] = true;

        if (support) {
            yesVotes += 1;
        } else {
            noVotes += 1;
        }
    }

    function getResults() public view returns (uint64, uint64) {
        return (yesVotes, noVotes);
    }
}
```

***

## 2. Identify Sensitive Data and Operations

Review your contract and determine which variables, functions, or computations require privacy. In this example, the vote counts (`yesVotes`, `noVotes`) and individual votes should be encrypted.

***

## 3. Integrate FHEVM and update your business logic accordingly.

Replace standard data types and operations with their FHEVM equivalents for the identified sensitive parts. Use encrypted types and FHEVM library functions to perform computations on encrypted data.

```solidity
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract EncryptedSimpleVoting is ZamaEthereumConfig {
    enum VotingStatus {
        Open,
        DecryptionRequested,
        ResultsRevealed
    }
    mapping(address => bool) public hasVoted;

    VotingStatus public status;

    uint64 public revealedYesVotes;
    uint64 public revealedNoVotes;

    uint256 public voteDeadline;

    euint64 private encryptedYesVotes;
    euint64 private encryptedNoVotes;

    event ResultsDecryptionRequested(euint64 yes, euint64 no);

    constructor() {
        encryptedYesVotes = FHE.asEuint64(0);
        encryptedNoVotes = FHE.asEuint64(0);

        FHE.allowThis(encryptedYesVotes);
        FHE.allowThis(encryptedNoVotes);
    }

    function vote(externalEbool support, bytes memory inputProof) public {
        require(block.timestamp <= voteDeadline, "Too late to vote");
        require(!hasVoted[msg.sender], "Already voted");
        hasVoted[msg.sender] = true;
        ebool isSupport = FHE.fromExternal(support, inputProof);
        encryptedYesVotes = FHE.select(isSupport, FHE.add(encryptedYesVotes, 1), encryptedYesVotes);
        encryptedNoVotes = FHE.select(isSupport, encryptedNoVotes, FHE.add(encryptedNoVotes, 1));
        FHE.allowThis(encryptedYesVotes);
        FHE.allowThis(encryptedNoVotes);
    }

    /// @notice Marks the vote totals as publicly decryptable. Anyone can then call
    /// the off-chain `publicDecrypt` (via the Zama SDK) to obtain the cleartexts
    /// and a decryption proof.
    function requestVoteDecryption() public {
        require(block.timestamp > voteDeadline, "Voting is not finished");
        require(status == VotingStatus.Open, "Decryption already requested");

        FHE.makePubliclyDecryptable(encryptedYesVotes);
        FHE.makePubliclyDecryptable(encryptedNoVotes);

        status = VotingStatus.DecryptionRequested;

        emit ResultsDecryptionRequested(encryptedYesVotes, encryptedNoVotes);
    }

    /// @notice Submits the off-chain cleartexts together with the KMS-signed proof.
    /// `FHE.checkSignatures` reverts if the proof does not match the handles or values.
    /// @dev The handle order MUST match the order used to generate the proof off-chain.
    function revealResults(uint64 yesVotes, uint64 noVotes, bytes memory decryptionProof) public {
        require(status == VotingStatus.DecryptionRequested, "Decryption was not requested");

        bytes32[] memory handles = new bytes32[](2);
        handles[0] = FHE.toBytes32(encryptedYesVotes);
        handles[1] = FHE.toBytes32(encryptedNoVotes);

        FHE.checkSignatures(handles, abi.encode(yesVotes, noVotes), decryptionProof);

        revealedYesVotes = yesVotes;
        revealedNoVotes = noVotes;
        status = VotingStatus.ResultsRevealed;
    }

    function getResults() public view returns (uint64, uint64) {
        require(status == VotingStatus.ResultsRevealed, "Results were not revealed");
        return (revealedYesVotes, revealedNoVotes);
    }
}
```

Adjust your contract's code to accept and return encrypted data where necessary. This may involve changing function parameters and return types to work with ciphertexts instead of plaintext values, as shown above.

* The `vote` function now takes two parameters: an encrypted `support` handle and its `inputProof`.
* After the deadline, anyone calls `requestVoteDecryption()` to mark the encrypted totals as publicly decryptable.
* An off-chain client then calls `publicDecrypt([yesHandle, noHandle])` via the Zama SDK to obtain the cleartexts and a KMS-signed proof, and submits them via `revealResults(...)`. `FHE.checkSignatures` cryptographically guarantees the cleartexts are authentic before the contract trusts them.
* `getResults()` only returns once the cleartexts have been verified on-chain.

However, this is far from being the main change. As this example illustrates, working with FHEVM often requires re-architecting the original logic to support privacy.

In the updated code, the logic becomes asynchronous: results are hidden until they are explicitly marked as publicly decryptable, decrypted off-chain, and verified back on-chain. See [Public Decryption](/protocol/solidity-guides/smart-contract/oracle.md) for the full step-by-step workflow.

## Conclusion

As this short guide showed, integrating with FHEVM not only requires integration with the FHEVM stack, it also requires refactoring your business logic to support mechanism to swift between encrypted and non-encrypted components of the logic.


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/solidity-guides/development-guide/transform_smart_contract_with_fhevm.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
