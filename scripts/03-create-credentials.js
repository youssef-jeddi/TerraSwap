/**
 * TerraSwap - Script 03: Create Credentials
 * 
 * Issues KYC credentials from the KYC Issuer to users:
 * - SwissKYC credential → Alice
 * - MiCAKYC credential → Bob
 * 
 * CredentialType must be hex-encoded.
 * Credentials are not valid until the subject accepts them.
 * 
 * Run: node scripts/03-create-credentials.js
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

// Convert a string to hex (XRPL requires hex-encoded CredentialType)
function stringToHex(str) {
    let hex = "";
    for (let i = 0; i < str.length; i++) {
        hex += str.charCodeAt(i).toString(16).padStart(2, "0");
    }
    return hex.toUpperCase();
}

async function issueCredential(client, issuerWallet, subjectAddress, credentialType) {
    const credTypeHex = stringToHex(credentialType);
    console.log(`   Credential type: "${credentialType}" → hex: ${credTypeHex}`);

    const tx = {
        TransactionType: "CredentialCreate",
        Account: issuerWallet.address,
        Subject: subjectAddress,
        CredentialType: credTypeHex,
    };

    const result = await client.submitAndWait(tx, { autofill: true, wallet: issuerWallet });
    const status = result.result.meta.TransactionResult;
    console.log(`   CredentialCreate: ${status}`);

    if (status === "tesSUCCESS") {
        // Extract credential info from the affected nodes
        const affectedNodes = result.result.meta.AffectedNodes;
        const credentialNode = affectedNodes.find(
            (node) => node.CreatedNode && node.CreatedNode.LedgerEntryType === "Credential"
        );
        if (credentialNode) {
            console.log(`   Credential created on ledger ✅`);
            console.log(`   Ledger index: ${credentialNode.CreatedNode.LedgerIndex}`);
        }
    }

    return status === "tesSUCCESS";
}

async function acceptCredential(client, subjectWallet, issuerAddress, credentialType) {
    const credTypeHex = stringToHex(credentialType);

    const tx = {
        TransactionType: "CredentialAccept",
        Account: subjectWallet.address,
        Issuer: issuerAddress,
        CredentialType: credTypeHex,
    };

    const result = await client.submitAndWait(tx, { autofill: true, wallet: subjectWallet });
    const status = result.result.meta.TransactionResult;
    console.log(`   CredentialAccept: ${status}`);
    return status === "tesSUCCESS";
}

async function main() {
    const accounts = loadAccounts();
    const client = new xrpl.Client(DEVNET_URL);
    await client.connect();
    console.log("✅ Connected to Devnet\n");

    const kycIssuerWallet = xrpl.Wallet.fromSeed(accounts.kycIssuer.seed);
    const aliceWallet = xrpl.Wallet.fromSeed(accounts.alice.seed);
    const bobWallet = xrpl.Wallet.fromSeed(accounts.bob.seed);

    // Step 1: Issue SwissKYC credential to Alice
    console.log("🇨🇭 Issuing SwissKYC credential to Alice...");
    await issueCredential(client, kycIssuerWallet, aliceWallet.address, "SwissKYC");
    console.log("");

    // Step 2: Alice accepts the credential
    console.log("✋ Alice accepting SwissKYC credential...");
    await acceptCredential(client, aliceWallet, kycIssuerWallet.address, "SwissKYC");
    console.log("");

    // Step 3: Issue MiCAKYC credential to Bob
    console.log("🇪🇺 Issuing MiCAKYC credential to Bob...");
    await issueCredential(client, kycIssuerWallet, bobWallet.address, "MiCAKYC");
    console.log("");

    // Step 4: Bob accepts the credential
    console.log("✋ Bob accepting MiCAKYC credential...");
    await acceptCredential(client, bobWallet, kycIssuerWallet.address, "MiCAKYC");
    console.log("");

    // Step 5: Verify credentials by checking account objects
    console.log("🔍 Verifying credentials...\n");

    const aliceObjects = await client.request({
        command: "account_objects",
        account: aliceWallet.address,
        type: "credential",
    });
    console.log(`Alice's credentials: ${aliceObjects.result.account_objects.length} found`);
    for (const obj of aliceObjects.result.account_objects) {
        console.log(`   Type: ${obj.CredentialType} | Issuer: ${obj.Issuer} | Accepted: ${obj.Flags === 0x10000 || obj.Accepted ? "Yes" : "Check flags"}`);
    }

    const bobObjects = await client.request({
        command: "account_objects",
        account: bobWallet.address,
        type: "credential",
    });
    console.log(`\nBob's credentials: ${bobObjects.result.account_objects.length} found`);
    for (const obj of bobObjects.result.account_objects) {
        console.log(`   Type: ${obj.CredentialType} | Issuer: ${obj.Issuer} | Accepted: ${obj.Flags === 0x10000 || obj.Accepted ? "Yes" : "Check flags"}`);
    }

    console.log("\n🎉 Credentials issued and accepted!");

    await client.disconnect();
}

main().catch(console.error);