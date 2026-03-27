/**
 * TerraSwap - Script 02: Issue Stablecoins
 * 
 * Issues CHF and EUR stablecoins as IOUs using trust lines.
 * - Alice sets a trust line for CHF and receives CHF from issuer
 * - Bob sets a trust line for EUR and receives EUR from issuer
 * - Both set trust lines for both currencies (for later testing)
 * 
 * Run: node scripts/02-issue-stablecoins.js
 */

import xrpl from "xrpl";
import fs from "fs";

const DEVNET_URL = "wss://s.devnet.rippletest.net:51233";
const ACCOUNTS_FILE = "scripts/accounts.json";

function loadAccounts() {
    if (!fs.existsSync(ACCOUNTS_FILE)) {
        console.error("❌ accounts.json not found. Run 01-setup-accounts.js first.");
        process.exit(1);
    }
    return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, "utf-8"));
}

async function setTrustLine(client, wallet, currency, issuerAddress) {
    const tx = {
        TransactionType: "TrustSet",
        Account: wallet.address,
        LimitAmount: {
            currency: currency,
            issuer: issuerAddress,
            value: "1000000", // Max amount the account is willing to hold
        },
    };

    const result = await client.submitAndWait(tx, { autofill: true, wallet });
    const status = result.result.meta.TransactionResult;
    console.log(`   TrustSet ${currency} for ${wallet.address}: ${status}`);
    return status === "tesSUCCESS";
}

async function sendTokens(client, issuerWallet, destination, currency, amount) {
    const tx = {
        TransactionType: "Payment",
        Account: issuerWallet.address,
        Destination: destination,
        Amount: {
            currency: currency,
            issuer: issuerWallet.address,
            value: amount,
        },
    };

    const result = await client.submitAndWait(tx, { autofill: true, wallet: issuerWallet });
    const status = result.result.meta.TransactionResult;
    console.log(`   Payment ${amount} ${currency} → ${destination}: ${status}`);
    return status === "tesSUCCESS";
}

async function main() {
    const accounts = loadAccounts();
    const client = new xrpl.Client(DEVNET_URL);
    await client.connect();
    console.log("✅ Connected to Devnet\n");

    // Restore wallets from seeds
    const issuerWallet = xrpl.Wallet.fromSeed(accounts.stablecoinIssuer.seed);
    const aliceWallet = xrpl.Wallet.fromSeed(accounts.alice.seed);
    const bobWallet = xrpl.Wallet.fromSeed(accounts.bob.seed);

    // Step 1: Set trust lines
    console.log("📋 Setting trust lines...\n");

    // Alice trusts CHF and EUR
    await setTrustLine(client, aliceWallet, "CHF", issuerWallet.address);
    await setTrustLine(client, aliceWallet, "EUR", issuerWallet.address);

    // Bob trusts CHF and EUR
    await setTrustLine(client, bobWallet, "CHF", issuerWallet.address);
    await setTrustLine(client, bobWallet, "EUR", issuerWallet.address);

    console.log("");

    // Step 2: Issue stablecoins
    console.log("💰 Issuing stablecoins...\n");

    // Send CHF to Alice
    await sendTokens(client, issuerWallet, aliceWallet.address, "CHF", "10000");

    // Send EUR to Bob
    await sendTokens(client, issuerWallet, bobWallet.address, "EUR", "10000");

    // Give both some of the other currency too for testing
    await sendTokens(client, issuerWallet, aliceWallet.address, "EUR", "1000");
    await sendTokens(client, issuerWallet, bobWallet.address, "CHF", "1000");

    console.log("");

    // Step 3: Verify balances
    console.log("🔍 Verifying balances...\n");

    const aliceBalances = await client.request({
        command: "account_lines",
        account: aliceWallet.address,
    });
    console.log("Alice's token balances:");
    for (const line of aliceBalances.result.lines) {
        console.log(`   ${line.currency}: ${line.balance}`);
    }

    const bobBalances = await client.request({
        command: "account_lines",
        account: bobWallet.address,
    });
    console.log("\nBob's token balances:");
    for (const line of bobBalances.result.lines) {
        console.log(`   ${line.currency}: ${line.balance}`);
    }

    console.log("\n🎉 Stablecoins issued successfully!");
    console.log(`\nCheck on explorer:`);
    console.log(`   Alice: https://devnet.xrpl.org/accounts/${aliceWallet.address}`);
    console.log(`   Bob:   https://devnet.xrpl.org/accounts/${bobWallet.address}`);

    await client.disconnect();
}

main().catch(console.error);