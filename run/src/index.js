import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { loadKeypair, sendAndConfirmOptimalTransaction } from "./utils.js";
import {
    initMintIx,
    allocTreeIx,
    createCollectionIx,
    mintCnftNativeIx,
    swapBuyNftMintIx,
    swapBuyNftIx,
    swapSellNftIx,
} from "./supe-nft-ft.js";
import IDL from "../idl/supe.json";
import BN from "bn.js";
// 寻找nft信息相关依赖
import { getAssetWithProof, mapProof } from "./umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { dasApi } from "@metaplex-foundation/digital-asset-standard-api";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { mplBubblegum } from "@metaplex-foundation/mpl-bubblegum";
import { nftCalculatorConfig } from "./constant/nftCalculatorConfig";

async function main() {
    const endpoint = "rpc url";
    const connection = new Connection(endpoint, "confirmed");
    // 本地账户
    const owner = loadKeypair("../config/user.json");
    const wallet = new anchor.Wallet(owner);
    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
    anchor.setProvider(provider);
    const supeFunProgram = new anchor.Program(IDL, provider);
    // 账户：签名/支付，看本地情况更改
    const user = loadKeypair("../config/user.json");
    const treeKeypair = Keypair.generate();
    const collectionMint = Keypair.generate();
    let ix;
    let txSig;
    let args = null;

    // Create=========>
    let ixs = [];
    /*
	supe使用配置：/constant/nftCalculator.js
	maxDepth, maxBufferSize, canopyDepth 决定最大交易数量，使用totalSupply划分。
	例如：totalSupply = 1023 < nftCalculator/type: 1024则使用其配置。

	网站：https://compressed.app
	*/
    const { maxDepth, maxBufferSize, canopyDepth } = nftCalculatorConfig[0].tree[1];
    const initMintIxs = await initMintIx(supeFunProgram, user, treeKeypair.publicKey, collectionMint.publicKey);
    ixs.push(initMintIxs);

    const allocTreeIxs = await allocTreeIx(connection, treeKeypair.publicKey, user, maxDepth, maxBufferSize, canopyDepth);
    ixs.push(allocTreeIxs);

    // Single NFT 和Series NFT，使用isOnePic区分

    // Single NFT
    args = {
        collectionName: "KookyNftCollections",
        collectionSymbol: "KookyNft",
        collectionUri: "https://newgame.mypinata.cloud/ipfs/QmRWcywn5CqLMfBEEkW6bAKAfLEGjDQBte7LKgceFfvn2D",
        totalSupply: 10,
        isOnePic: true, // 单张：true，多组件：false
        presellPercent: 8000, // mint百分比：80 * 100
        createFee: new BN(0.1 * LAMPORTS_PER_SOL),
        buyFeeRate: 100, //buy fee %: 1*100
        sellFeeRate: 200, //sell fee %: 2*100
        maxDepth,
        maxBufferSize,
        canopyDepth,
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

    // Series NFT
    // const args = {
    //     collectionName: "KookyNftCollections",
    //     collectionSymbol: "KookyNft",
    //     collectionUri: "https://newgame.mypinata.cloud/ipfs/QmRWcywn5CqLMfBEEkW6bAKAfLEGjDQBte7LKgceFfvn2D",
    //     totalSupply: 10,
    //     isOnePic: false, // 单张：true，多组件：false
    //     presellPercent: 8000, // mint百分比：80 * 100
    //     createFee: new BN(0.1 * LAMPORTS_PER_SOL),
    //     buyFeeRate: 100, //buy fee %: 1*100
    //     sellFeeRate: 200, //sell fee %: 2*100
    //     maxDepth,
    //     maxBufferSize,
    //     canopyDepth,
    //     priceParams: [
    //         {
    //             // endTokenId = totalSupply(10) * presellPercent(0.8)后，切断小数点取整，奇数+1，偶数原值
    //             endTokenId: 8, // mint 的最后一个id，
    //             isNativeToken: true,
    //             paymentMint: NATIVE_MINT, // not any meaning.
    //             salesPrice: new BN(0.005 * LAMPORTS_PER_SOL), // mint时支付的数量
    //         },
    //     ],
    // };
    ix = await createCollectionIx(supeFunProgram, args, user, treeKeypair.publicKey, collectionMint.publicKey);
    txSig = await sendAndConfirmOptimalTransaction({
        connection,
        ixs: ixs,
        payer: user,
        otherSigners: [treeKeypair.publicKey, collectionMint.publicKey],
    });

    // MINT NFT=========>
    ix = await mintCnftNativeIx(supeFunProgram, user, treeKeypair.publicKey, collectionMint.publicKey);
    txSig = await sendAndConfirmOptimalTransaction({
        connection,
        ixs: [ix],
        payer: user,
    });

    // BUY MINT NFT(mint一部分，剩下的会自动转入pool中)=========>
    args = 1;
    ix = await swapBuyNftMintIx(supeFunProgram, args, user, treeKeypair.publicKey, collectionMint.publicKey);
    txSig = await sendAndConfirmOptimalTransaction({
        connection,
        ixs: [ix],
        payer: user,
    });

    // SWAP BUY POOL NFT=========>
    {
        // nft id
        // const result = getAssetsByPool('');
        // 处理result提取出asset id，如下⬇️
        const nftIds = ["J5kMAc6LL5864xqjauXkYPZFD2XEmVEXQ7cWsUTFEpMc"];
        const buyNftInfo = await getNftInfoAssetId(connection, nftIds);
        ix = await swapBuyNftIx(supeFunProgram, buyNftInfo.swapData, user, treeKeypair.publicKey, buyNftInfo.remainingAccounts);
        txSig = await sendAndConfirmOptimalTransaction({
            connection,
            ixs: [ix],
            payer: user,
        });
    }

    // SWAP SELL POOL NFT=========>
    {
        // nft id
        // const result = getAssetsByOwner('用户钱包地址');
        // 处理result提取出asset id，如下⬇️
        const nftIds = ["J5kMAc6LL5864xqjauXkYPZFD2XEmVEXQ7cWsUTFEpMc"];
        const sellNftInfo = await getNftInfoAssetId(connection, nftIds);
        ix = await swapSellNftIx(
            supeFunProgram,
            sellNftInfo.swapData,
            user,
            treeKeypair.publicKey,
            sellNftInfo.remainingAccounts
        );
        txSig = await sendAndConfirmOptimalTransaction({
            connection,
            ixs: [ix],
            payer: user,
        });
    }
}

// 直接传递assetId
const getNftInfoAssetId = async (connection, tokenIds) => {
    const umi = createUmi(connection.rpcEndpoint).use(dasApi()).use(mplTokenMetadata()).use(mplBubblegum());
    let swapData = [];
    let remainingAccounts = [];

    await Promise.all(
        tokenIds.map(async (assetId) => {
            const assetWithProof = await getAssetWithProof(umi, assetId);
            const proofPathAsAccounts = mapProof(assetWithProof);

            remainingAccounts.push(...proofPathAsAccounts);
            swapData.push({
                root: Array.from(assetWithProof.root),
                dataHash: Array.from(assetWithProof.dataHash),
                creatorHash: Array.from(assetWithProof.creatorHash),
                nonce: new BN(assetWithProof.nonce),
                index: assetWithProof.index,
                proofLength: proofPathAsAccounts.length,
            });
        })
    );

    return {
        swapData,
        remainingAccounts,
    };
};

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
