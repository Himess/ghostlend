> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/sdk-guides/webapp.md).

# Build a web application

This document guides you through building a web application using the `@zama-fhe/relayer-sdk` library.

## Using directly the library

### Step 1: Setup the library

`@zama-fhe/relayer-sdk` consists of multiple files, including WASM files and WebWorkers, which can make packaging these components correctly in your setup cumbersome. To simplify this process, especially if you're developing a dApp with server-side rendering (SSR), we recommend using our CDN.

#### Using UMD CDN

Include this line at the top of your project.

```html
<script src="https://cdn.zama.ai/relayer-sdk-js/0.2.0/relayer-sdk-js.umd.cjs" type="text/javascript"></script>
```

In your project, you can use the bundle import if you install `@zama-fhe/relayer-sdk` package:

```javascript
import { initSDK, createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk/bundle";
```

#### Using ESM CDN

If you prefer You can also use the `@zama-fhe/relayer-sdk` as a ES module:

```html
<script type="module">
  import { initSDK, createInstance, SepoliaConfig } from "https://cdn.zama.ai/relayer-sdk-js/0.2.0/relayer-sdk-js.js";

  await initSDK();
  const config = { ...SepoliaConfig, network: window.ethereum };
  config.network = window.ethereum;
  const instance = await createInstance(config);
</script>
```

#### Using npm package

Install the `@zama-fhe/relayer-sdk` library to your project:

```bash
# Using npm
npm install @zama-fhe/relayer-sdk

# Using Yarn
yarn add @zama-fhe/relayer-sdk

# Using pnpm
pnpm add @zama-fhe/relayer-sdk
```

`@zama-fhe/relayer-sdk` uses ESM format. You need to set the [type to "module" in your package.json](https://nodejs.org/api/packages.html#type). If your node project use `"type": "commonjs"` or no type, you can force the loading of the web version by using `import { createInstance } from '@zama-fhe/relayer-sdk/web';`

```javascript
import { initSDK, createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk";
```

### Step 2: Initialize your project

To use the library in your project, you need to load the WASM of [TFHE](https://www.npmjs.com/package/tfhe) first with `initSDK`.

```javascript
import { initSDK } from "@zama-fhe/relayer-sdk/bundle";

const init = async () => {
  await initSDK(); // Load needed WASM
};
```

### Step 3: Create an instance

Once the WASM is loaded, you can now create an instance.

```javascript
import { initSDK, createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk/bundle";

const init = async () => {
  await initSDK(); // Load FHE
  const config = { ...SepoliaConfig, network: window.ethereum };
  return createInstance(config);
};

init().then((instance) => {
  console.log(instance);
});
```

You can now use your instance to [encrypt parameters](/protocol/solidity-guides/v0.10/docs/sdk-guides/input.md), perform [user decryptions](/protocol/solidity-guides/v0.10/docs/sdk-guides/user-decryption.md) or [public decryptions](/protocol/solidity-guides/v0.10/docs/sdk-guides/public-decryption.md).


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/solidity-guides/v0.10/docs/sdk-guides/webapp.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
