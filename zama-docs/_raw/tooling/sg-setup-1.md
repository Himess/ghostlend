> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/solidity-guides/getting-started/setup-1.md).

# Set up Foundry

This page walks through setting up a Foundry project for FHEVM smart contract development.

### Prerequisites

* [Foundry](https://book.getfoundry.sh/getting-started/installation) (latest)

### Option 1: Clone the FHEVM Foundry template (recommended)

The [FHEVM Foundry Template](https://github.com/zama-ai/fhevm-foundry-template) ships a working setup — `foundry.toml`, `remappings.txt`, an example `FHECounter` contract, tests, and deploy scripts.

{% stepper %}
{% step %}
**Clone the template**

```bash
git clone https://github.com/zama-ai/fhevm-foundry-template
cd fhevm-foundry-template
```

{% endstep %}

{% step %}
**Install dependencies with Soldeer**

The template uses [Soldeer](https://soldeer.xyz) for dependency management. Run:

```bash
forge soldeer install
```

This installs `forge-fhevm`, `@fhevm/solidity`, `encrypted-types`, OpenZeppelin contracts, and `forge-std` into the `dependencies/` directory.
{% endstep %}

{% step %}
**Compile and run the tests**

```bash
forge build
forge test -vvv
```

You should see the example `FHECounter` tests pass.
{% endstep %}
{% endstepper %}

### Option 2: Add forge-fhevm to an existing project

If you already have a Foundry project, add `forge-fhevm` as a [Soldeer](https://soldeer.xyz) dependency. The shape of the configuration is shown below; for the exact pinned versions, copy `foundry.toml` and `remappings.txt` from the [Foundry template](https://github.com/zama-ai/fhevm-foundry-template) — that's where the canonical, tested versions live.

**1. Configure `foundry.toml`**

`forge-fhevm` targets the Cancun EVM and a recent Solidity compiler. Your `foundry.toml` should look roughly like:

```toml
[profile.default]
src = "src"
out = "out"
libs = ["dependencies"]
test = "test"
script = "script"
evm_version = "cancun"
# solc = "0.8.x"   # see the template for the version currently tested

[dependencies]
# See the template's foundry.toml for the current versions
forge-std = "..."
"@encrypted-types" = "..."
"@fhevm-solidity" = "..."
forge-fhevm = { git = "https://github.com/zama-ai/forge-fhevm.git", rev = "..." }

[soldeer]
remappings_version = false
recursive_deps = true
```

**2. Install dependencies**

```bash
forge soldeer install
```

**3. Add remappings**

Soldeer materializes each dependency under `dependencies/<name>-<version>/`, so your `remappings.txt` needs an entry per import prefix. The shape is:

```
@fhevm/host-contracts/=dependencies/forge-fhevm-<rev>/src/fhevm-host/
@fhevm/solidity/=dependencies/@fhevm-solidity-<version>/
encrypted-types/=dependencies/@encrypted-types-<version>/
forge-fhevm/=dependencies/forge-fhevm-<rev>/src/
forge-std/=dependencies/forge-std-<version>/src
```

Replace the `<version>` / `<rev>` placeholders with whatever Soldeer wrote into `dependencies/`, or copy the whole file from the [template `remappings.txt`](https://github.com/zama-ai/fhevm-foundry-template/blob/main/remappings.txt) and adjust as you upgrade.

### Verify the install

Create a minimal test file:

```solidity
// test/Setup.t.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FhevmTest} from "forge-fhevm/FhevmTest.sol";

contract SetupTest is FhevmTest {
    function test_setupDeploys() public view {
        // setUp() deploys all FHEVM host contracts at deterministic addresses
        assertTrue(address(_executor) != address(0));
        assertTrue(address(_acl) != address(0));
    }
}
```

```bash
forge test --match-test test_setupDeploys -vv
```

### Where to go next

🟨 Go to [**Write FHEVM tests in Foundry**](/protocol/solidity-guides/development-guide/foundry/write_test.md) to start writing tests with `forge-fhevm`.

🟨 Go to [**Deploy FHEVM contracts with Foundry**](/protocol/solidity-guides/development-guide/foundry/deploy.md) for the deployment workflow.


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/solidity-guides/getting-started/setup-1.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
