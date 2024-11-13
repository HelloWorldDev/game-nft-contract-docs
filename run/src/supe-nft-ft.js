import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { createAllocTreeIx } from "@solana/spl-account-compression";
import {
    NFT_SWAP_PROGRAM_ID,
    NFT_SWAP_TOKEN_METADATA_PROGRAM_ID,
    NFT_SWAP_BUBBLEGUM_PROGRAM_ID,
    NFT_SWAP_DEFAULT_TREASURY,
} from "~/constant";

const PROGRAM_ID = new PublicKey(NFT_SWAP_PROGRAM_ID);
const TOKEN_METADATA_PROGRAM_ID = new PublicKey(NFT_SWAP_TOKEN_METADATA_PROGRAM_ID);
const BUBBLEGUM_PROGRAM_ID = new PublicKey(NFT_SWAP_BUBBLEGUM_PROGRAM_ID);
const DEFAULT_TREASURY = new PublicKey(NFT_SWAP_DEFAULT_TREASURY);

function findPda(seeds, programId) {
    return PublicKey.findProgramAddressSync(seeds, programId);
}

function treeConfigPda(treeKeypair, bubblegumProgramId = BUBBLEGUM_PROGRAM_ID) {
    return findPda([treeKeypair.toBuffer()], bubblegumProgramId)[0];
}

function collectionConfigPda(treeConfig, programId = PROGRAM_ID) {
    return findPda([Buffer.from("cNFT"), treeConfig.toBuffer()], programId)[0];
}

function findMetadataPda(mint, tokenMetadataProgramId = TOKEN_METADATA_PROGRAM_ID) {
    return findPda([Buffer.from("metadata"), tokenMetadataProgramId.toBuffer(), mint.toBuffer()], tokenMetadataProgramId)[0];
}

function associatedTokenAccount(collectionMint, collectionConfig) {
    return anchor.utils.token.associatedAddress({
        mint: collectionMint,
        owner: collectionConfig,
    });
}

function findMasterEditionPda(mint, tokenMetadataProgramId = TOKEN_METADATA_PROGRAM_ID) {
    return findPda(
        [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer(), Buffer.from("edition")],
        tokenMetadataProgramId
    )[0];
}

function bubblegumSignerPda(bubblegumProgramId = BUBBLEGUM_PROGRAM_ID) {
    return findPda([Buffer.from("collection_cpi", "utf8")], bubblegumProgramId)[0];
}

function poolNativePda(treeKeypair, programId = PROGRAM_ID) {
    return findPda([Buffer.from("pool"), treeKeypair.toBuffer()], programId)[0];
}

// Methods
// init Mint
export function initMintIx(program, user, treeKeypair, collectionMint) {
    const treeConfig = treeConfigPda(treeKeypair);
    const collectionConfig = collectionConfigPda(treeConfig);
    return program.methods
        .initializeMint()
        .accountsPartial({
            payer: user,
            collectionConfig,
            mint: collectionMint,
        })
        .instruction();
}

// create Alloc Tree
export async function allocTreeIx(connection, treeKeypair, user, maxDepth, maxBufferSize, canopyDepth) {
    return await createAllocTreeIx(
        connection,
        treeKeypair,
        user,
        { maxDepth: maxDepth, maxBufferSize: maxBufferSize },
        canopyDepth
    );
}

// 创建nft
export function createCollectionIx(program, args, user, treeKeypair, collectionMint) {
    const treeConfig = treeConfigPda(treeKeypair);
    const collectionConfig = collectionConfigPda(treeConfig);

    return program.methods
        .createCollection(args)
        .accountsPartial({
            authority: user,
            treeConfig,
            tree: treeKeypair,
            collectionConfig,
            platformTreasury: DEFAULT_TREASURY, // 平台金库
            mint: collectionMint,
            associatedTokenAccount: associatedTokenAccount(collectionMint, collectionConfig),
            metadataAccount: findMetadataPda(collectionMint),
            masterEditionAccount: findMasterEditionPda(collectionMint),
        })
        .instruction();
}

// Native Mint Nft
export function mintCnftNativeIx(program, user, treeKeypair, collectionMint) {
    const treeConfig = treeConfigPda(treeKeypair);
    const collectionConfig = collectionConfigPda(treeConfig);

    return program.methods
        .mintCnftNative()
        .accountsPartial({
            payer: user,
            leafOwner: user,
            leafDelegate: user,
            tree: treeKeypair,
            treeConfig: treeConfig,
            collectionConfig: collectionConfig,
            platformTreasury: DEFAULT_TREASURY,
            bubblegumSigner: bubblegumSignerPda(),
            collectionMint: collectionMint,
            collectionMetadata: findMetadataPda(collectionMint),
            collectionMasterEdition: findMasterEditionPda(collectionMint),
        })
        .instruction();
}

// swap Buy Nft Mint
export function swapBuyNftMintIx(program, args, user, treeKeypair, collectionMint) {
    const treeConfig = treeConfigPda(treeKeypair);
    const collectionConfig = collectionConfigPda(treeConfig);

    return program.methods
        .swapBuyNftMint(args)
        .accountsPartial({
            payer: user,
            tree: treeKeypair,
            treeConfig: treeConfig,
            pool: poolNativePda(treeKeypair),
            treasury: DEFAULT_TREASURY,
            collectionConfig: collectionConfig,
            collectionMint: collectionMint,
            collectionEdition: findMasterEditionPda(collectionMint),
            collectionMetadata: findMetadataPda(collectionMint),
            bubblegumSigner: bubblegumSignerPda(),
            treasuryTokenAccount: null,
            payerTokenAccount: null,
            poolTokenAccount: null,
        })
        .instruction();
}

// swap buy nft pool
export function swapBuyNftIx(program, args, user, treeKeypair, remainingAccounts) {
    const treeConfig = treeConfigPda(treeKeypair);
    return program.methods
        .swapBuyNftPool(args)
        .accountsPartial({
            payer: user,
            tree: treeKeypair,
            treeConfig: treeConfig,
            pool: poolNativePda(treeKeypair),
            treasury: DEFAULT_TREASURY,
            treasuryTokenAccount: null,
            payerTokenAccount: null,
            poolTokenAccount: null,
        })
        .remainingAccounts(remainingAccounts)
        .instruction();
}

// swap sell nft pool
export function swapSellNftIx(program, args, user, treeKeypair, remainingAccounts) {
    const treeConfig = treeConfigPda(treeKeypair);
    return program.methods
        .swapSellNft(args)
        .accountsPartial({
            payer: user,
            tree: treeKeypair,
            treeConfig: treeConfig,
            pool: poolNativePda(treeKeypair),
            treasury: DEFAULT_TREASURY,
            treasuryTokenAccount: null,
            payerTokenAccount: null,
            poolTokenAccount: null,
        })
        .remainingAccounts(remainingAccounts)
        .instruction();
}
