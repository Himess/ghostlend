> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/examples/openzeppelin-confidential-contracts/erc7984/swaperc7984toerc20.md).

# Swap ERC7984 to ERC20

Swapping from a confidential token to a non-confidential token is the most complex since the decrypted data must be accessed to accurately complete the request. This example demonstrates unwrapping a confidential ERC-7984 token back to a non-confidential ERC-20 token using a **1:1 exchange ratio** with OpenZeppelin's smart contract library powered by ZAMA's FHEVM.

{% hint style="info" %}
This is a simplified example using a 1:1 exchange ratio. The swap requires a two-step process: first the confidential transfer, then a finalization step after the encrypted amount has been decrypted.
{% endhint %}

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

* `.sol` file → `<your-project-root-dir>/contracts/`
* `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}
{% tab title="SwapERC7984ToERC20.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {FHE, externalEuint64, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";

contract SwapERC7984ToERC20 {
    error SwapERC7984ToERC20InvalidFinalization(euint64 amount);

    mapping(euint64 amount => address) private _receivers;
    IERC7984 private _fromToken;
    IERC20 private _toToken;

    constructor(IERC7984 fromToken, IERC20 toToken) {
        _fromToken = fromToken;
        _toToken = toToken;
    }

    function swapConfidentialToERC20(externalEuint64 encryptedInput, bytes memory inputProof) public {
        euint64 amount = FHE.fromExternal(encryptedInput, inputProof);
        FHE.allowTransient(amount, address(_fromToken));
        euint64 amountTransferred = _fromToken.confidentialTransferFrom(msg.sender, address(this), amount);

        FHE.makePubliclyDecryptable(amountTransferred);
        _receivers[amountTransferred] = msg.sender;
    }

    function finalizeSwap(euint64 amount, uint64 cleartextAmount, bytes calldata decryptionProof) public virtual {
        bytes32[] memory handles = new bytes32[](1);
        handles[0] = euint64.unwrap(amount);

        FHE.checkSignatures(handles, abi.encode(cleartextAmount), decryptionProof);
        address to = _receivers[amount];
        require(to != address(0), SwapERC7984ToERC20InvalidFinalization(amount));
        delete _receivers[amount];

        if (cleartextAmount != 0) {
            SafeERC20.safeTransfer(_toToken, to, cleartextAmount);
        }
    }
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
GET https://docs.zama.org/protocol/examples/openzeppelin-confidential-contracts/erc7984/swaperc7984toerc20.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
