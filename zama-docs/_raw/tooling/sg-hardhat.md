> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/solidity-guides/development-guide/hardhat.md).

# Hardhat plugin

This section will guide you through writing and testing FHEVM smart contracts in Solidity using [Hardhat](https://hardhat.org).

### The FHEVM Hardhat Plugin

To write FHEVM smart contracts using Hardhat, you need to install the [FHEVM Hardhat Plugin](https://www.npmjs.com/package/@fhevm/hardhat-plugin) in your Hardhat project.

This plugin enables you to develop, test, and interact with FHEVM contracts right out of the box.

It extends Hardhat’s functionality with a complete FHEVM API that allows you:

* Encrypt data
* Decrypt data
* Run tests using various FHEVM execution modes
* Write FHEVM-enabled Hardhat Tasks

### Where to go next

🟨 Go to [**Setup Hardhat**](/protocol/solidity-guides/getting-started/setup.md) to initialize your FHEVM Hardhat project.

🟨 Go to [**Write FHEVM Tests in Hardhat**](/protocol/solidity-guides/development-guide/hardhat/write_test.md) for details on writing tests of FHEVM smart contracts using Hardhat.

🟨 Go to [**Run FHEVM Tests in Hardhat**](/protocol/solidity-guides/development-guide/hardhat/run_test.md) to learn how to execute those tests in different FHEVM environments.

🟨 Go to [**Write FHEVM Hardhat Task**](/protocol/solidity-guides/development-guide/hardhat/write_task.md) to learn how to write your own custom FHEVM Hardhat task.


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/solidity-guides/development-guide/hardhat.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
