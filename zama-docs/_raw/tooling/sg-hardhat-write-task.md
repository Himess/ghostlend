> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/solidity-guides/development-guide/hardhat/write_task.md).

# Write FHEVM-enabled Hardhat Tasks

In this section, you'll learn how to write a custom FHEVM Hardhat task.

Writing tasks is a gas-efficient and flexible way to test your FHEVM smart contracts on the Sepolia network. Creating a custom task is straightforward.

## Prerequisite

* You should be familiar with Hardhat tasks. If you're new to them, refer to the [Hardhat Tasks official documentation](https://hardhat.org/hardhat-runner/docs/guides/tasks#writing-tasks).
* You should have already **completed** the [FHEVM Tutorial](https://docs.zama.ai/protocol/solidity-guides/getting-started/setup).
* This page provides a step-by-step walkthrough of the `task:decrypt-count` tasks included in the file [tasks/FHECounter.ts](https://github.com/zama-ai/fhevm-hardhat-template/blob/main/tasks/FHECounter.ts) file, located in the [fhevm-hardhat-template](https://github.com/zama-ai/fhevm-hardhat-template) repository.

{% stepper %}
{% step %}

## A Basic Hardhat Task.

Let’s start with a simple example: fetching the current counter value from a basic `Counter.sol` contract.

If you're already familiar with Hardhat and custom tasks, the TypeScript code below should look familiar and be easy to follow:

```ts
task("task:get-count", "Calls the getCount() function of Counter Contract")
  .addOptionalParam("address", "Optionally specify the Counter contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const CounterDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("Counter");
    console.log(`Counter: ${CounterDeployment.address}`);

    const counterContract = await ethers.getContractAt("Counter", CounterDeployment.address);

    const clearCount = await counterContract.getCount();

    console.log(`Clear count    : ${clearCount}`);
});
```

Now, let’s modify this task to work with FHEVM encrypted values.
{% endstep %}

{% step %}

## Comment Out Existing Logic and rename

First, comment out the existing logic so we can incrementally add the necessary changes for FHEVM integration.

```ts
task("task:get-count", "Calls the getCount() function of Counter Contract")
  .addOptionalParam("address", "Optionally specify the Counter contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    // const { ethers, deployments } = hre;

    // const CounterDeployment = taskArguments.address
    //   ? { address: taskArguments.address }
    //   : await deployments.get("Counter");
    // console.log(`Counter: ${CounterDeployment.address}`);

    // const counterContract = await ethers.getContractAt("Counter", CounterDeployment.address);

    // const clearCount = await counterContract.getCount();

    // console.log(`Clear count    : ${clearCount}`);
});
```

Next, rename the task by replacing:

```ts
task("task:get-count", "Calls the getCount() function of Counter Contract")
```

With:

```ts
task("task:decrypt-count", "Calls the getCount() function of Counter Contract")
```

This updates the task name from `task:get-count` to `task:decrypt-count`, reflecting that it now includes decryption logic for FHE-encrypted values.
{% endstep %}

{% step %}

## Initialize FHEVM CLI API

Replace the line:

```ts
    // const { ethers, deployments } = hre;
```

With:

```ts
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();
```

{% hint style="warning" %}
Calling `initializeCLIApi()` is essential. Unlike built-in Hardhat tasks like `test` or `compile`, which automatically initialize the FHEVM runtime environment, custom tasks require you to call this function explicitly. **Make sure to call it at the very beginning of your task** to ensure the environment is properly set up.
{% endhint %}
{% endstep %}

{% step %}

## Call the view function `getCount` from the FHECounter contract

Replace the following commented-out lines:

```ts
    // const CounterDeployment = taskArguments.address
    //   ? { address: taskArguments.address }
    //   : await deployments.get("Counter");
    // console.log(`Counter: ${CounterDeployment.address}`);

    // const counterContract = await ethers.getContractAt("Counter", CounterDeployment.address);

    // const clearCount = await counterContract.getCount();
```

With the FHEVM equivalent:

```ts
    const FHECounterDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("FHECounter");
    console.log(`FHECounter: ${FHECounterDeployment.address}`);

    const fheCounterContract = await ethers.getContractAt("FHECounter", FHECounterDeployment.address);

    const encryptedCount = await fheCounterContract.getCount();
    if (encryptedCount === ethers.ZeroHash) {
      console.log(`encrypted count: ${encryptedCount}`);
      console.log("clear count    : 0");
      return;
    }
```

Here, `encryptedCount` is an FHE-encrypted `euint32` primitive. To retrieve the actual value, we need to decrypt it in the next step.
{% endstep %}

{% step %}

## Decrypt the encrypted count value.

Now replace the following commented-out line:

```ts
    // console.log(`Clear count    : ${clearCount}`);
```

With the decryption logic:

```ts
    const signers = await ethers.getSigners();
    const clearCount = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedCount,
      FHECounterDeployment.address,
      signers[0],
    );
    console.log(`Encrypted count: ${encryptedCount}`);
    console.log(`Clear count    : ${clearCount}`);
```

At this point, your custom Hardhat task is fully configured to work with FHE-encrypted values and ready to run!
{% endstep %}

{% step %}

## Step 6: Run your custom task using Hardhat Node

**Start the Local Hardhat Node:**

* Open a new terminal window.
* From the root project directory, run the following:

```sh
npx hardhat node
```

**Deploy the FHECounter smart contract on the local Hardhat Node**

```sh
npx hardhat deploy --network localhost
```

**Run your custom task**

```sh
npx hardhat task:decrypt-count --network localhost
```

{% endstep %}

{% step %}

## Step 7: Run your custom task using Sepolia

**Deploy the FHECounter smart contract on Sepolia Testnet (if not already deployed)**

```sh
npx hardhat deploy --network sepolia
```

**Execute your custom task**

```sh
npx hardhat task:decrypt-count --network sepolia
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
GET https://docs.zama.org/protocol/solidity-guides/development-guide/hardhat/write_task.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
