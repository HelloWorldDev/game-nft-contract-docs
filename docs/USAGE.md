# 使用文档

## 项目名称

Supe.com

## 目录

1. [简介](#简介)
2. [安装](#安装)
    - [前提条件](#前提条件)
3. [local 使用方法](#local-使用方法)
    - [初始化](#初始化)
    - [创建合集](#创建合集)
        - [Single NFT](#Single NFT)
        - [Series NFT](#Series NFT)
    - [MINT NFT](#MINT NFT)
    - [BUY MINT NFT](#BUY MINT NFT)
    - [BUY POOL NFT](#BUY POOL NFT)
    - [SELL POOL NFT](#SELL POOL NFT)
4. [重点解释](#重点解释)

## 简介

Supe.com 是一款支持 NFT 挂单买卖 以及 AMM 买卖的 NFT 交易平台，旨在通过智能合约的挂单记录以及 AMM 机制，实现链上 NFT 的交易买卖。
本文档详细介绍了该项目的安装、配置和使用方法。

```typescript
// NFT_SWAP_PROGRAM_ID
const NFT_SWAP_PROGRAM_ID = "FAKvSE6CypSNAXVGtZQVbFkFRJ6Hu5j2dqzB28Y4Supe";
// BUBBLEGUM_PROGRAM_ID
export const NFT_SWAP_BUBBLEGUM_PROGRAM_ID = "BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY";
// TOKEN_METADATA_PROGRAM_ID
export const NFT_SWAP_TOKEN_METADATA_PROGRAM_ID = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";
// 手续费地址
export const NFT_SWAP_DEFAULT_TREASURY = "2pw9hArdNoY9Q4tYt54fZSWC3hfNhtStf1aXKCbHFfNE";

// IDL：详见/idl/supe.json
```

## 安装

### 前提条件

-   \*\*Node.js v22.x

    -   支持 Node.js 22 版本及其子版本
    -   检查版本：`node -v`
    -   安装指定版本：

        ```sh
        # 使用 nvm（Node Version Manager）来安装特定版本
        nvm install 22
        nvm use 22
        ```

    -   安装链接：[Node.js](https://nodejs.org/en/download/package-manager)

-   \*\*Anchor v0.30.1
    -   检查版本：`anchor --version`
    -   安装命令：
        ```sh
        cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
        avm install 0.30.1
        ```
    -   安装链接：[Anchor](https://www.anchor-lang.com/docs/installation)

## local 使用方法

### 初始化

在使用合约方法之前，需要先进行初始化：

```typescript
const endpoint = "rpc url";
const connection = new Connection(endpoint, "confirmed");
const owner = loadKeypair("~/.config/solana/id.json");
const wallet = new anchor.Wallet(owner);
const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
anchor.setProvider(provider);
// newPumpProgramId
const supeProgramId = new PublicKey("FAKvSE6CypSNAXVGtZQVbFkFRJ6Hu5j2dqzB28Y4Supe");
// supeFunProgram
const supeFunProgram: anchor.Program<NewPump> = new anchor.Program(IDL, provider);
```

1. 创建连接 `Connection` 实例，可以更改 `endpoint` 以测试不同的节点。
2. `owner` 为 solana 默认本地钱包。
3. 创建 anchor provider 和 program 实例，根据需要修改 idl 接口文件路径。

### 创建合集

#### Single NFT

下面是创建 Single NFT 的方法：

```typescript
const args =  {
        collectionName: "KookyNftCollections",
        collectionSymbol: "KookyNft",
        collectionUri: "https://newgame.mypinata.cloud/ipfs/QmRWcywn5CqLMfBEEkW6bAKAfLEGjDQBte7LKgceFfvn2D",
        totalSupply: 10,
        isOnePic: true, // 单张：true，多组件：false
        presellPercent: 8000, // mint百分比：80 * 100
        createFee: new BN(0.1 * LAMPORTS_PER_SOL), // 创建费用
        buyFeeRate: 100, //buy fee %: 1*100
        sellFeeRate: 200, //sell fee %: 2*100
        maxDepth: maxDepth, // 用于存储该合集下所有 NFT 的深度参数
        maxBufferSize: maxBufferSize, // 用于存储该合集下所有 NFT 的深度参数
        canopyDepth: canopyDepth, // 用于存储该合集下所有 NFT 的深度参数
        priceParams: [
            {
                // endTokenId = totalSupply(10) * presellPercent(0.8)后，切断小数点取整，奇数+1，偶数原值
                endTokenId: 8, // mint 的最后一个id，
                isNativeToken: true,
                paymentMint: NATIVE_MINT, // not any meaning.
                salesPrice: new BN(0.005 * LAMPORTS_PER_SOL), // mint时支付的代币数量
            },
        ],
    };
ix = await createCollectionIx(
    supeFunProgram,
    args,
    user.publicKey,
    treeKeypair.publicKey
    collectionMint.publicKey
);
```

`createCollectionIx` 为封装的调用合约 `createCollection` 指令，`supeFunProgram` 为 program 实例，传入代币信息，args 为创建参数。`user.publicKey` 为用户公钥，`treeKeypair.publicKey` 用于存储该合集下所有 NFT 信息，`collectionMint.publicKey` 为 collection 公钥。

supe 使用配置：/constant/nftCalculator.js
`maxDepth, maxBufferSize, canopyDepth`决定最大交易数量，使用 totalSupply 划分。

例如：totalSupply = 1023 < nftCalculator/type: 1024 则使用其配置。
tree -> 1：使用其参数`maxDepth: 10, maxBufferSize: 32, canopyDepth: 0`，每次交易只能 1 个 NFT；
tree -> 2：使用其参数`maxDepth: 10, maxBufferSize: 32, canopyDepth: 7`，每次交易支持 3 个 NFT；
tree -> 3：使用其参数`maxDepth: 10, maxBufferSize: 32, canopyDepth: 10`，每次交易支持 6 个 NFT；
网站：https://compressed.app

#### Series NFT

下面是创建 Series NFT 的方法：

```typescript
const args =  {
        collectionName: "KookyNftCollections",
        collectionSymbol: "KookyNft",
        collectionUri: "https://newgame.mypinata.cloud/ipfs/QmRLsSUqxS4jw8jZan2vu8qkHhipKHxwt1ZQx56Povpkyo",
        totalSupply: 10,
        isOnePic: false, // 单张：true，多组件：false
        presellPercent: 8000, // mint百分比：80 * 100
        createFee: new BN(0.1 * LAMPORTS_PER_SOL),
        buyFeeRate: 100, //buy fee %: 1*100
        sellFeeRate: 200, //sell fee %: 2*100
        maxDepth: maxDepth, // 用于存储该合集下所有 NFT 的深度参数
        maxBufferSize: maxBufferSize, // 用于存储该合集下所有 NFT 的深度参数
        canopyDepth: canopyDepth, // 用于存储该合集下所有 NFT 的深度参数
        priceParams: [
            {
                // endTokenId = totalSupply(10) * presellPercent(0.8)后，切断小数点取整，奇数+1，偶数原值
                endTokenId: 8, // mint 的最后一个id，
                isNativeToken: true,
                paymentMint: NATIVE_MINT, // not any meaning.
                salesPrice: new BN(0.005 * LAMPORTS_PER_SOL), // mint时支付的数量
            },
        ],
    };
ix = await createCollectionIx(
    supeFunProgram,
    args,
    user.publicKey,
    treeKeypair.publicKey
    collectionMint.publicKey
);
```

`createCollectionIx` 为封装的调用合约 `createCollection` 指令，`supeFunProgram` 为 program 实例，传入代币信息，args 为创建参数。`user.publicKey` 为用户公钥，`treeKeypair.publicKey` 用于存储该合集下所有 NFT 信息，`collectionMint.publicKey` 为 collection 公钥。

### MINT NFT

下面是创建 MINT NFT 的方法：

```typescript
ix = await mintCnftNativeIx(supeFunProgram, user.publicKey, treeKeypair.publicKey, collectionMint.publicKey);
```

### SWAP BUY MINT NFT

下面是 SWAP BUY MINT NFT 的方法：

```typescript
const args = 1; // 1档是1个NFT，2档和3档是3个NFT
ix = await swapBuyNftMintIx(supeFunProgram, args, user.publicKey, treeKeypair.publicKey, collectionMint.publicKey);
```

### SWAP BUY POOL NFT

下面是 SWAP BUY POOL NFT 的方法：

```typescript
// nftId:[], // 1档支持1个NFT，2档支持3个NFT，3档支持6个NFT
// 此方法详见 run/src/index.js Function: getNftInfoAssetId
const nftInfo = await getNftInfoAssetId(connection, nftId, treeMint);
ix = await swapBuyNftIx(supeFunProgram, nftInfo.swapData, user.publicKey, treeKeypair.publicKey, nftInfo.remainingAccounts);
```

### SWAP SELL POOL NFT

下面是 SWAP SELL POOL NFT 的方法：

```typescript
// nftId:[], // 1档支持1个NFT，2档支持3个NFT，3档支持6个NFT
// 此方法详见 run/sec/index.js Function: getNftInfoAssetId
const nftInfo = await getNftInfoAssetId(connection, nftId, treeKeypair.publicKey);
ix = await swapSellNftIx(supeFunProgram, nftInfo.swapData, user.publicKey, treeKeypair.publicKey, nftInfo.remainingAccounts);
```

## 重点解释

/constant/nftCalculator.js 是创建时选择的 tree 深度配置,1,2,3 为三个档位

```typescript
// 当前交易货币为Native SOL，每次可以swap的inputValue的值为1，3，6
const tree = {
    1: {}, // 1
    2: {}, // 3
    3: {}, // 6
};
```
