/**
 * TerraSwap - Send Stablecoins to Any Address
 *
 * Usage: node scripts/send-stablecoins.js <address> <CHF|EUR> <amount>
 *
 * Sends stablecoins from the Stablecoin Issuer to the given address.
 * The user must have a trust line set up first (via the TerraSwap app).
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

const VALID_CURRENCIES = ["CHF", "EUR"];

async function main() {
    const args = process.argv.slice(2);

    if (args.length < 3) {
        console.log("Usage: node scripts/send-stablecoins.js <address> <CHF|EUR> <amount>");
        console.log("");
        console.log("Example:");
        console.log("  node scripts/send-stablecoins.js rN7n7otQDd6FczFgLdlqtyMVrn3HMfXoQT CHF 1000");
        console.log("");
        console.log("Note: The recipient must have a trust line for the currency (set up via the app).");
        process.exit(1);
    }

    const [address, currency, amount] = args;

    if (!VALID_CURRENCIES.includes(currency)) {
        console.error(`Invalid currency: ${currency}`);
        console.error(`Valid currencies: ${VALID_CURRENCIES.join(", ")}`);
        process.exit(1);
    }

    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        console.error("Amount must be a positive number.");
        process.exit(1);
    }

    const accounts = loadAccounts();
    const client = new xrpl.Client(DEVNET_URL);
    await client.connect();
    console.log("Connected to Devnet\n");

    const issuerWallet = xrpl.Wallet.fromSeed(accounts.stablecoinIssuer.seed);

    console.log(`Sending ${amount} ${currency} to ${address}...`);

    const tx = {
        TransactionType: "Payment",
        Account: issuerWallet.address,
        Destination: address,
        Amount: {
            currency: currency,
            issuer: issuerWallet.address,
            value: amount,
        },
    };

    const result = await client.submitAndWait(tx, { autofill: true, wallet: issuerWallet });
    const status = result.result.meta.TransactionResult;

    if (status === "tesSUCCESS") {
        console.log(`\nSent ${amount} ${currency} successfully!`);
    } else {
        console.log(`\nTransaction result: ${status}`);
        if (status === "tecPATH_DRY") {
            console.log("The recipient may not have a trust line for this currency.");
            console.log("They need to set up a trust line via the TerraSwap app first.");
        }
    }

    await client.disconnect();
}

main().catch(console.error);
