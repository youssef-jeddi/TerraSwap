/**
 * TerraSwap - Script 01: Setup Accounts
 * 
 * Creates and funds all the accounts needed for the project on Devnet.
 * Saves the wallet info to a JSON file so other scripts can reuse them.
 * 
 * Run: node scripts/01-setup-accounts.js
 */

import xrpl from "xrpl";
import fs from "fs";

const DEVNET_URL = "wss://s.devnet.rippletest.net:51233";
const ACCOUNTS_FILE = "scripts/accounts.json";

async function main() {
    const client = new xrpl.Client(DEVNET_URL);
    await client.connect();
    console.log("✅ Connected to Devnet\n");

    const accountNames = [
        "kycIssuer",        // Issues credentials (SwissKYC, MiCAKYC)
        "domainOwner",      // Creates Permissioned Domains
        "stablecoinIssuer", // Issues CHF and EUR IOUs
        "alice",            // Swiss user
        "bob",              // EU user
    ];

    const accounts = {};

    for (const name of accountNames) {
        console.log(`🔑 Creating account: ${name}...`);
        const fundResult = await client.fundWallet();
        const wallet = fundResult.wallet;

        accounts[name] = {
            address: wallet.address,
            seed: wallet.seed,
            publicKey: wallet.publicKey,
        };

        console.log(`   Address: ${wallet.address}`);
        console.log(`   Seed:    ${wallet.seed}`);
        console.log(`   Balance: ${fundResult.balance} XRP`);
        console.log(`   Explorer: https://devnet.xrpl.org/accounts/${wallet.address}`);
        console.log("");
    }

    // Save accounts to file for other scripts to use
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2));
    console.log(`💾 Accounts saved to ${ACCOUNTS_FILE}`);
    console.log("\n🎉 All accounts created and funded!");

    await client.disconnect();
}

main().catch(console.error);