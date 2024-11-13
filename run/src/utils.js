import { getSimulationComputeUnits } from "@solana-developers/helpers";
import { TransactionMessage, VersionedTransaction, ComputeBudgetProgram, Keypair } from "@solana/web3.js";
import fs from "fs";
import resolve from "resolve-dir";

const confirmOptions = {
    skipPreflight: true,
};

export function loadKeypair(jsonPath) {
    return Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(resolve(jsonPath)).toString())));
}

export function loadProgramIdl(filepath) {
    return JSON.parse(fs.readFileSync(resolve(filepath), "utf-8"));
}

async function buildOptimalTransaction({ connection, instructions, payer, lookupTables }) {
    const [microLamports, units, recentBlockhash] = await Promise.all([
        500000,
        await getSimulationComputeUnits(connection, instructions, payer, lookupTables)
            .then((units) => {
                if (units) {
                    return units + 20000;
                } else {
                    return 600000;
                }
            })
            .catch((error) => {
                throw new Error(error.message);
            }),
        await connection.getLatestBlockhash(),
    ]);

    instructions.unshift(ComputeBudgetProgram.setComputeUnitPrice({ microLamports }));
    if (units) {
        instructions.unshift(ComputeBudgetProgram.setComputeUnitLimit({ units }));
    }

    return {
        transaction: new VersionedTransaction(
            new TransactionMessage({
                recentBlockhash: recentBlockhash.blockhash,
                instructions,
                payerKey: payer,
            }).compileToV0Message(lookupTables)
        ),
        recentBlockhash,
    };
}

export async function sendAndConfirmOptimalTransaction({ type, connection, supeFunProgram, ixs, payer, otherSigners = [] }) {
    const txResult = await buildOptimalTransaction({
        connection,
        instructions: ixs,
        payer,
        lookupTables: [],
    });

    if (otherSigners) {
        txResult.transaction.sign(otherSigners);
    }

    const signTx = await supeFunProgram.provider.wallet.signTransaction(txResult.transaction, confirmOptions);
    const signature = await connection.sendTransaction(signTx, "confirmed");
    const confirmResult = await connection.confirmTransaction(signature, "confirmed");

    return {
        signature,
        confirmResult,
    };
}
