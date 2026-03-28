/**
 * TerraSwap - Cancel All Offers for an Account
 *
 * Usage: node scripts/cancel-offers.js <alice|bob>
 *
 * Cancels all open offers for the specified account.
 */

import xrpl from "xrpl";
import fs from "fs";

const DEVNET_URL = "wss://s.devnet.rippletest.net:51233";
const ACCOUNTS_FILE = "scripts/accounts.json";

function loadAccounts() {
    if (!fs.existsSync(ACCOUNTS_FILE)) {
        console.error("accounts.json not found. Run 01-setup-accounts.js first.");
        process.exit(1);
    }
    return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, "utf-8"));
}

async function main() {
    const args = process.argv.slice(2);
    const accountName = args[0];

    if (!accountName) {
        console.log("Usage: node scripts/cancel-offers.js <alice|bob>");
        process.exit(1);
    }

    const accounts = loadAccounts();
    if (!accounts[accountName]) {
        console.error(`Unknown account: ${accountName}`);
        process.exit(1);
    }

    const client = new xrpl.Client(DEVNET_URL);
    await client.connect();
    console.log("Connected to Devnet\n");

    const wallet = xrpl.Wallet.fromSeed(accounts[accountName].seed);

    const result = await client.request({
        command: "account_offers",
        account: wallet.address,
    });

    const offers = result.result.offers || [];
    console.log(`${accountName} has ${offers.length} open offer(s)\n`);

    for (const offer of offers) {
        const tx = {
            TransactionType: "OfferCancel",
            Account: wallet.address,
            OfferSequence: offer.seq,
        };

        const cancelResult = await client.submitAndWait(tx, { autofill: true, wallet });
        const status = cancelResult.result.meta.TransactionResult;
        console.log(`Cancelled offer #${offer.seq}: ${status}`);
    }

    if (offers.length > 0) {
        console.log("\nAll offers cancelled.");
    }

    await client.disconnect();
}

main().catch(console.error);
