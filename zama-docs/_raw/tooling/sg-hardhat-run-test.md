> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/solidity-guides/development-guide/hardhat/run_test.md).

# Deploy contracts and run tests

In this section, you'll find everything you need to test your FHEVM smart contracts in your [Hardhat](https://hardhat.org) project.

### FHEVM Runtime Modes

The FHEVM Hardhat plugin provides three **FHEVM runtime modes** tailored for different stages of contract development and testing. Each mode offers a trade-off between speed, encryption, and persistence.

1. The **Hardhat (In-Memory)** default network: 🧪 *Uses mock encryption.* Ideal for regular tests, CI test coverage, and fast feedback during early contract development. No real encryption is used.
2. The **Hardhat Node (Local Server)** network: 🧪 *Uses mock encryption.* Ideal when you need persistent state - for example, when testing frontend interactions, simulating user flows, or validating deployments in a realistic local environment. Still uses mock encryption.
3. The **Sepolia Testnet** network: 🔐 *Uses real encryption.* Use this mode once your contract logic is stable and validated locally. This is the only mode that runs on the full FHEVM stack with **real encrypted values**. It simulates real-world production conditions but is slower and requires Sepolia ETH.

{% hint style="success" %}
**Zama Testnet** is not a blockchain itself. It is a protocol that enables you to run confidential smart contracts on existing blockchains (such as Ethereum, Base, and others) with the support of encrypted types. See the [FHE on blockchain](https://docs.zama.ai/protocol/protocol/overview) guide to learn more about the protocol architecture.

Currently, **Zama Protocol** is available on the **Sepolia Testnet**. Support for additional chains will be added in the future. [See the roadmap↗](https://docs.zama.ai/protocol/zama-protocol-litepaper#roadmap)
{% endhint %}

#### Summary

| Mode              | Encryption         | Persistent | Chain     | Speed        | Usage                                             |
| ----------------- | ------------------ | ---------- | --------- | ------------ | ------------------------------------------------- |
| Hardhat (default) | 🧪 Mock            | ❌ No       | In-Memory | ⚡⚡ Very Fast | Fast local testing and coverage                   |
| Hardhat Node      | 🧪 Mock            | ✅ Yes      | Server    | ⚡ Fast       | Frontend integration and local persistent testing |
| Sepolia Testnet   | 🔐 Real Encryption | ✅ Yes      | Server    | 🐢 Slow      | Full-stack validation with real encrypted data    |

### The FHEVM Hardhat Template

To demonstrate the three available testing modes, we'll use the [fhevm-hardhat-template](https://github.com/zama-ai/fhevm-hardhat-template), which comes with the FHEVM Hardhat Plugin pre-installed, a basic `FHECounter` smart contract, and ready-to-use tasks for interacting with a deployed instance of this contract.

### Run on Hardhat (default)

To run your tests in-memory using FHEVM mock values, simply run the following:

```sh
npx hardhat test --network hardhat
```

### Run on Hardhat Node

You can also run your tests against a local Hardhat node, allowing you to deploy contract instances and interact with them in a persistent environment.

{% stepper %}
{% step %}
**Launch the Hardhat Node server:**

* Open a new terminal window.
* From the root project directory, run the following:

```sh
npx hardhat node
```

{% endstep %}

{% step %}
**Run your test suite (optional):**

From the root project directory:

```sh
npx hardhat test --network localhost
```

{% endstep %}

{% step %}
**Deploy the `FHECounter` smart contract on Hardhat Node**

From the root project directory:

```sh
npx hardhat deploy --network localhost
```

Check the deployed contract FHEVM configuration:

```sh
npx hardhat fhevm check-fhevm-compatibility --network localhost --address <deployed contract address>
```

{% endstep %}

{% step %}
**Interact with the deployed `FHECounter` smart contract**

From the root project directory:

1. Decrypt the current counter value:

```sh
npx hardhat --network localhost task:decrypt-count
```

2. Increment the counter by 1:

```sh
npx hardhat --network localhost task:increment --value 1
```

3. Decrypt the new counter value:

```sh
npx hardhat --network localhost task:decrypt-count
```

{% endstep %}
{% endstepper %}

### Run on Sepolia Ethereum Testnet

To test your FHEVM smart contract using real encrypted values, you can run your tests on the Sepolia Testnet.

{% stepper %}
{% step %}
**Rebuild the project for Sepolia**

From the root project directory:

```sh
npx hardhat clean
npx hardhat compile --network sepolia
```

{% endstep %}

{% step %}
**Deploy the `FHECounter` smart contract on Sepolia**

```sh
npx hardhat deploy --network sepolia
```

{% endstep %}

{% step %}
**Check the deployed `FHECounter` contract FHEVM configuration**

From the root project directory:

```sh
npx hardhat fhevm check-fhevm-compatibility --network sepolia --address <deployed contract address>
```

If an internal exception is raised, it likely means the contract was not properly compiled for the Sepolia network.
{% endstep %}

{% step %}
**Interact with the deployed `FHECounter` contract**

From the root project directory:

1. Decrypt the current counter value (⏳ wait...):

```sh
npx hardhat --network sepolia task:decrypt-count
```

2. Increment the counter by 1 (⏳ wait...):

```sh
npx hardhat --network sepolia task:increment --value 1
```

3. Decrypt the new counter value (⏳ wait...):

```sh
npx hardhat --network sepolia task:decrypt-count
```

{% endstep %}
{% endstepper %}


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/solidity-guides/development-guide/hardhat/run_test.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
