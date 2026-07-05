> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/sdk-guides/webpack.md).

# Common webpack errors

This document provides solutions for common Webpack errors encountered during the development process. Follow the steps below to resolve each issue.

## Can't resolve 'tfhe\_bg.wasm'

**Error message:** `Module not found: Error: Can't resolve 'tfhe_bg.wasm'`

**Cause:** In the codebase, there is a `new URL('tfhe_bg.wasm')` which triggers a resolve by Webpack.

**Possible solutions:** You can add a fallback for this file by adding a resolve configuration in your `webpack.config.js`:

```javascript
resolve: {
  fallback: {
    'tfhe_bg.wasm': require.resolve('tfhe/tfhe_bg.wasm'),
  },
},
```

## Buffer not defined

**Error message:** `ReferenceError: Buffer is not defined`

**Cause:** This error occurs when the Node.js `Buffer` object is used in a browser environment where it is not natively available.

**Possible solutions:** To resolve this issue, you need to provide browser-compatible fallbacks for Node.js core modules. Install the necessary browserified npm packages and configure Webpack to use these fallbacks.

```javascript
resolve: {
  fallback: {
    buffer: require.resolve('buffer/'),
    crypto: require.resolve('crypto-browserify'),
    stream: require.resolve('stream-browserify'),
    path: require.resolve('path-browserify'),
  },
},
```

## Issue with importing ESM version

**Error message:** Issues with importing ESM version

**Cause:** With a bundler such as Webpack or Rollup, imports will be replaced with the version mentioned in the `"browser"` field of the `package.json`. This can cause issues with typing.

**Possible solutions:**

* If you encounter issues with typing, you can use this [tsconfig.json](https://github.com/zama-ai/fhevm-react-template/blob/main/tsconfig.json) using TypeScript 5.
* If you encounter any other issue, you can force import of the browser package.

## Use bundled version

**Error message:** Issues with bundling the library, especially with SSR frameworks.

**Cause:** The library may not bundle correctly with certain frameworks, leading to errors during the build or runtime process.

**Possible solutions:** Use the [prebundled version available](/protocol/solidity-guides/v0.10/docs/sdk-guides/webapp.md) with `@zama-fhe/relayer-sdk/bundle`. Embed the library with a `<script>` tag and initialize it as shown below:

```javascript
const start = async () => {
  await window.fhevm.initSDK(); // load wasm needed
  const config = { ...SepoliaConfig, network: window.ethereum };
  config.network = window.ethereum;
  const instance = window.fhevm.createInstance(config).then((instance) => {
    console.log(instance);
  });
};
```


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/solidity-guides/v0.10/docs/sdk-guides/webpack.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
