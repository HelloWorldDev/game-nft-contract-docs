import * as web3 from "@solana/web3.js";
import { publicKey } from "@metaplex-foundation/umi";
import { findLeafAssetIdPda, parseLeafFromMintToCollectionV1Transaction } from "@metaplex-foundation/mpl-bubblegum";
import * as mplbubblegum from "@metaplex-foundation/mpl-bubblegum";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

export function findAssetId(umi, merkleTree, leafIndex) {
    const [assetId, bump] = findLeafAssetIdPda(umi, {
        merkleTree: publicKey(merkleTree),
        leafIndex,
    });
    return assetId;
}

export async function getAssetBySignature(umi, signature, merkleTree) {
    const signatureUint8Array = bs58.decode(signature);

    const leaf = await parseLeafFromMintToCollectionV1Transaction(umi, signatureUint8Array);
    const assetId = findAssetId(umi, merkleTree, leaf.nonce);
    return [leaf, assetId];
}

export async function getAsset(umi, assetId) {
    return await umi.rpc.getAsset(publicKey(assetId));
}

export async function getAssetProof(umi, assetId) {
    return await umi.rpc.getAssetProof(publicKey(assetId));
}

export async function getAssetsByAuthority(umi, authority) {
    return await umi.rpc.getAssetsByAuthority({ authority: publicKey(authority) });
}

export async function getAssetsByOwner(umi, owner) {
    return await umi.rpc.getAssetsByOwner({ owner: publicKey(owner) });
}

export async function getAssetWithProof(umi, assetId) {
    const assetWithProof = await mplbubblegum.getAssetWithProof(umi, publicKey(assetId), { truncateCanopy: true });
    return assetWithProof;
}

export const mapProof = (assetProof) => {
    return assetProof.proof.map((node) => ({
        pubkey: new web3.PublicKey(node),
        isSigner: false,
        isWritable: false,
    }));
};

// get all nfts in collections
export async function getAssetListByCollection(umi, collectionMint) {
    return await umi.rpc.getAssetsByGroup({
        groupKey: "collection",
        groupValue: publicKey(collectionMint),
    });
}
