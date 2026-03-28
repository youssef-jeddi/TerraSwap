/**
 * TerraSwap - Issue Credential to Any Address
 *
 * Usage: node scripts/issue-credential.js <address> <SwissKYC|MiCAKYC>
 *
 * Issues a CredentialCreate from the KYC Issuer to the given address.
 * The user must then accept it via the TerraSwap app (CredentialAccept).
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
        console.log("Usage: node scripts/issue-credential.js <address> <SwissKYC|MiCAKYC>");
        console.log("");
        console.log("Example:");
        console.log("  node scripts/issue-credential.js rN7n7otQDd6FczFgLdlqtyMVrn3HMfXoQT SwissKYC");
        process.exit(1);
    }

    const [address, credentialType] = args;

    if (!VALID_CREDENTIALS.includes(credentialType)) {
        console.error(`Invalid credential type: ${credentialType}`);
        console.error(`Valid types: ${VALID_CREDENTIALS.join(", ")}`);
        process.exit(1);
    }

    const accounts = loadAccounts();
    const client = new xrpl.Client(DEVNET_URL);
    await client.connect();
    console.log("Connected to Devnet\n");

    const kycIssuerWallet = xrpl.Wallet.fromSeed(accounts.kycIssuer.seed);
    const credTypeHex = stringToHex(credentialType);

    console.log(`Issuing ${credentialType} credential to ${address}...`);
    console.log(`  Credential type hex: ${credTypeHex}`);

    const tx = {
        TransactionType: "CredentialCreate",
        Account: kycIssuerWallet.address,
        Subject: address,
        CredentialType: credTypeHex,
    };

    const result = await client.submitAndWait(tx, { autofill: true, wallet: kycIssuerWallet });
    const status = result.result.meta.TransactionResult;

    if (status === "tesSUCCESS") {
        console.log(`\nCredential issued successfully!`);
        console.log(`The user can now accept it via the TerraSwap app.`);
    } else {
        console.log(`\nTransaction result: ${status}`);
    }

    await client.disconnect();
}

main().catch(console.error);
