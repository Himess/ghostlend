> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/solidity-guides/getting-started/quick-start-tutorial.md).

# Quick start tutorial (Hardhat)

This tutorial guides you to start quickly with Zama’s **Fully Homomorphic Encryption (FHE)** technology for building confidential smart contracts.

## What You’ll Learn

In **about 30 minutes**, you'll go from a basic Solidity contract to a fully confidential one using **FHEVM**. Here's what you'll do:

1. Set up your development environment
2. Write a simple Solidity smart contract
3. Convert it into an FHEVM-compatible confidential contract
4. Test your FHEVM-compatible confidential contract

## Prerequisite

* A basic understanding of **Solidity** library and **Ethereum**.
* Some familiarity with **Hardhat.**

{% hint style="info" %}

#### About Hardhat

[**Hardhat**](https://hardhat.org/) is a development environment for compiling, deploying, testing, and debugging Ethereum smart contracts. It’s widely used in the Ethereum ecosystem.

In this tutorial, we'll introduce the FHEVM hardhat template that provides an easy way to use FHEVM.
{% endhint %}


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/solidity-guides/getting-started/quick-start-tutorial.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
