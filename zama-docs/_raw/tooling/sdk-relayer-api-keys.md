> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/sdk/guides/relayer-api-keys.md).

# Relayer API keys

The Relayer API key provides secure access to Zama's hosted Relayer service on mainnet. This guide explains how to obtain and use your API key.

## Overview

There are two options to access the FHEVM Relayer for mainnet deployment:

**Self-hosted Relayer:** Deploy and operate your own Relayer instance, fund your own gateway wallet, and handle transactions independently. See the [Self-host Relayer](https://github.com/zama-ai/fhevm/blob/main/relayer/docs/SELF_HOSTING.md) documentation for set-up guides and configuration references.

**Zama-hosted Relayer:** Connect to Zama's hosted Relayer using an API key for authentication. Transaction fees will be billed on a monthly basis according to the usage, with possible discounts and grants applied directly in the invoice.

Start by submitting the form below, the Zama team will review your request and contact you with next steps.

→ [Apply for an API key](https://forms.gle/jq84zEek1oiv3kBz9)

{% hint style="warning" %}
Before publishing your solution on mainnet, ensure that end-to-end integration has been successfully tested on testnet.
{% endhint %}

## Using your API key

Once you receive your API key, wire it into the SDK using one of the two strategies covered in the [Authentication guide](/protocol/sdk/guides/authentication.md):

* **Backend proxy** (recommended for browser apps) — the proxy injects the `x-api-key` header so the key never reaches the client.
* **Direct API key** (server-side apps only) — pass the key in the relayer transport's `auth` field as `{ __type: "ApiKeyHeader", value: ... }`.

For the Zama-hosted relayer, `ApiKeyHeader` is the supported `auth` method — the hosted endpoint accepts the key only in the `x-api-key` header. (`BearerToken` and `ApiKeyCookie` apply to self-hosted relayers or proxied setups.)

The Authentication guide includes copy-paste examples for both, an Express proxy reference implementation, and the full table of supported `auth` methods.

## Security best practices

Your API key grants access to Zama's hosted Relayer with sponsored operations. Follow these security guidelines to protect your key:

### Keep your key private

* **Never expose your API key in client-side code** (frontend applications, mobile apps, etc.)
* **Never commit your API key** to version control systems
* **Never share your API key** with unauthorized parties

### Secure implementation

The recommended approach depends on your application architecture:

* **In-browser applications**: Proxy all Relayer requests through your backend server so the API key remains server-side and never reaches the client.
* **Server-side applications**: Store the API key in environment variables and load it securely at runtime.

### Backend proxy pattern

The proxy must add the `x-api-key` header to every forwarded request, so the key stays server-side and your frontend never sees it. See the [Authentication guide](/protocol/sdk/guides/authentication.md) for a working Express proxy and the matching client-side `relayerUrl` configuration — the patterns there apply unchanged when the upstream is the Zama-hosted Relayer.

## Compromised keys

If you suspect your API key has been compromised:

1. **Immediately notify the Zama team** through <support@zama.org>.
2. **Request a new API key** from the Zama team
3. **Stop using the compromised key** in your applications

If Zama identifies that an API key has been compromised, the key holder will be notified immediately and the key may be suspended to prevent unauthorized usage.

## Next steps

* [Authentication](/protocol/sdk/guides/authentication.md) — wire your API key into the SDK via a backend proxy or direct `auth` field
* [Configuration](/protocol/sdk/guides/configuration.md) — full relayer, signer, and storage setup


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/sdk/guides/relayer-api-keys.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
