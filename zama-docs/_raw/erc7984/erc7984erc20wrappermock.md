> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/examples/openzeppelin-confidential-contracts/erc7984/erc7984erc20wrappermock.md).

# ERC-20 to Wrapped ERC-7984

Swapping from a non-confidential ERC-20 to a confidential ERC-7984 is simple and actually done within the `ERC7984ERC20Wrapper`. The wrapper operates in two steps:

1. **Token transfer**: The ERC-20 tokens are transferred in from the caller using `SafeERC20.safeTransferFrom()`, reverting automatically if unsuccessful.
2. **Confidential minting**: The contract mints equivalent ERC-7984 tokens to the recipient, which is guaranteed to succeed.

This example demonstrates how to deploy and test the wrapper using OpenZeppelin's smart contract library powered by ZAMA's FHEVM.

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

* `.sol` file → `<your-project-root-dir>/contracts/`
* `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}
{% tab title="ERC7984ERC20WrapperExample.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {ERC7984ERC20Wrapper, ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/extensions/ERC7984ERC20Wrapper.sol";

contract ERC7984ERC20WrapperExample is ERC7984ERC20Wrapper, ZamaEthereumConfig {
    constructor(
        IERC20 token,
        string memory name,
        string memory symbol,
        string memory uri
    ) ERC7984ERC20Wrapper(token) ERC7984(name, symbol, uri) {}
}

```

{% endtab %}

{% tab title="ERC7984Wrapper.test.ts" %}

```typescript
import { expect } from 'chai';
import { ethers, fhevm } from 'hardhat';

describe('ERC7984ERC20WrapperExample', function () {
  let wrapper: any;
  let erc20: any;
  let owner: any;
  let user: any;

  const WRAP_AMOUNT = 1000;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // Deploy a mock ERC20 token (OZ ERC20Mock takes name, symbol, decimals)
    erc20 = await ethers.deployContract('ERC20Mock', ['Test ERC20', 'TERC', 18]);

    // Deploy the wrapper
    wrapper = await ethers.deployContract('ERC7984ERC20WrapperExample', [
      await erc20.getAddress(),
      'Confidential Token',
      'cTKN',
      'https://example.com/wrapped'
    ]);
  });

  describe('Initialization', function () {
    it('should set the correct name', async function () {
      expect(await wrapper.name()).to.equal('Confidential Token');
    });

    it('should set the correct symbol', async function () {
      expect(await wrapper.symbol()).to.equal('cTKN');
    });

    it('should reference the correct underlying token', async function () {
      expect(await wrapper.underlying()).to.equal(await erc20.getAddress());
    });
  });
});

```

{% endtab %}
{% endtabs %}


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/examples/openzeppelin-confidential-contracts/erc7984/erc7984erc20wrappermock.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
