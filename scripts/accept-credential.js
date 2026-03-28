/**
 * TerraSwap - Accept Credential for a User
 *
 * Usage: node scripts/accept-credential.js <user-seed> <SwissKYC|MiCAKYC>
 *
 * Accepts a credential that was issued to the user by the KYC Issuer.
 * Use this when the wallet (e.g., Crossmark) doesn't support CredentialAccept yet.
 *
 * You can find your seed in your wallet's settings or export it.
 */

import xrpl from "xrpl";
import fs from "fs";

const DEVNET_URL = "wss://s.devnet.rippletest.net:51233";
const ACCOUNTS_FILE = "scripts/accounts.json";

function stringToHex(str) {
    let hex = "";
    for (let i = 0; i < str.length; i++) {
        hex += str.charCodeAt(i).toString(16).padStart(2, "0");
    }
    return hex.toUpperCase();
}

function loadAccounts() {
    if (!fs.existsSync(ACCOUNTS_FILE)) {
        console.error("accounts.json not found. Run 01-setup-accounts.js first.");
        process.exit(1);
    }
    return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, "utf-8"));
}

const VALID_CREDENTIALS = ["SwissKYC", "MiCAKYC"];

async function main() {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.log("Usage: node scripts/accept-credential.js <user-seed> <SwissKYC|MiCAKYC>");
        console.log("");
        console.log("Example:");
        console.log("  node scripts/accept-credential.js sEdXXXXXXXXXXXXXXXXXXXXXXXXX SwissKYC");
        process.exit(1);
    }

    const [userSeed, credentialType] = args;

    if (!VALID_CREDENTIALS.includes(credentialType)) {
        console.error(`Invalid credential type: ${credentialType}`);
        console.error(`Valid types: ${VALID_CREDENTIALS.join(", ")}`);
        process.exit(1);
    }

    const accounts = loadAccounts();
    const client = new xrpl.Client(DEVNET_URL);
    await client.connect();
    console.log("Connected to Devnet\n");

    const userWallet = xrpl.Wallet.fromSeed(userSeed);
    const credTypeHex = stringToHex(credentialType);

    console.log(`Accepting ${credentialType} credential for ${userWallet.address}...`);
    console.log(`  Credential type hex: ${credTypeHex}`);

    const tx = {
        TransactionType: "CredentialAccept",
        Account: userWallet.address,
        Issuer: accounts.kycIssuer.address,
        CredentialType: credTypeHex,
    };

    const result = await client.submitAndWait(tx, { autofill: true, wallet: userWallet });
    const status = result.result.meta.TransactionResult;

    if (status === "tesSUCCESS") {
        console.log(`\nCredential accepted successfully!`);
        console.log(`You now have access to the corresponding zone in TerraSwap.`);
    } else {
        console.log(`\nTransaction result: ${status}`);
    }

    await client.disconnect();
}

main().catch(console.error);
