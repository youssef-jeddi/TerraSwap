/**
 * TerraSwap - Script 04: Create Permissioned Domains
 * 
 * Creates two Permissioned Domains:
 * - Swiss Domain: accepts SwissKYC credentials from our KYC Issuer
 * - EU Domain: accepts MiCAKYC credentials from our KYC Issuer
 * 
 * Saves domain IDs to accounts.json for use in the DEX script.
 * 
 * Run: node scripts/04-create-domains.js
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

function stringToHex(str) {
    let hex = "";
    for (let i = 0; i < str.length; i++) {
        hex += str.charCodeAt(i).toString(16).padStart(2, "0");
    }
    return hex.toUpperCase();
}

async function createDomain(client, ownerWallet, issuerAddress, credentialType, domainName) {
    const credTypeHex = stringToHex(credentialType);

    const tx = {
        TransactionType: "PermissionedDomainSet",
        Account: ownerWallet.address,
        AcceptedCredentials: [
            {
                Credential: {
                    Issuer: issuerAddress,
                    CredentialType: credTypeHex,
                },
            },
        ],
    };

    console.log(`   Creating ${domainName}...`);
    console.log(`   Accepted credential: "${credentialType}" (${credTypeHex}) from ${issuerAddress}`);

    const result = await client.submitAndWait(tx, { autofill: true, wallet: ownerWallet });
    const status = result.result.meta.TransactionResult;
    console.log(`   PermissionedDomainSet: ${status}`);

    if (status === "tesSUCCESS") {
        // Extract the domain ID from the created node
        const affectedNodes = result.result.meta.AffectedNodes;
        const domainNode = affectedNodes.find(
            (node) => node.CreatedNode && node.CreatedNode.LedgerEntryType === "PermissionedDomain"
        );
        if (domainNode) {
            const domainID = domainNode.CreatedNode.LedgerIndex;
            console.log(`   Domain ID: ${domainID} ✅`);
            return domainID;
        }
    }

    return null;
}

async function main() {
    const accounts = loadAccounts();
    const client = new xrpl.Client(DEVNET_URL);
    await client.connect();
    console.log("✅ Connected to Devnet\n");

    const domainOwnerWallet = xrpl.Wallet.fromSeed(accounts.domainOwner.seed);
    const kycIssuerAddress = accounts.kycIssuer.address;

    // Step 1: Create Swiss Domain
    console.log("🇨🇭 Creating Swiss Domain...");
    const swissDomainID = await createDomain(
        client,
        domainOwnerWallet,
        kycIssuerAddress,
        "SwissKYC",
        "Swiss Domain"
    );
    console.log("");

    // Step 2: Create EU Domain
    console.log("🇪🇺 Creating EU Domain...");
    const euDomainID = await createDomain(
        client,
        domainOwnerWallet,
        kycIssuerAddress,
        "MiCAKYC",
        "EU Domain"
    );
    console.log("");

    // Save domain IDs to accounts file
    if (swissDomainID || euDomainID) {
        accounts.domains = {
            swiss: swissDomainID,
            eu: euDomainID,
        };
        fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2));
        console.log("💾 Domain IDs saved to accounts.json");
    }

    // Step 3: Verify domains exist
    console.log("\n🔍 Verifying domains...\n");

    const domainObjects = await client.request({
        command: "account_objects",
        account: domainOwnerWallet.address,
        type: "permissioned_domain",
    });

    console.log(`Domains owned by ${domainOwnerWallet.address}: ${domainObjects.result.account_objects.length} found`);
    for (const obj of domainObjects.result.account_objects) {
        console.log(`\n   Domain index: ${obj.index}`);
        console.log(`   Accepted credentials:`);
        for (const cred of obj.AcceptedCredentials) {
            const credInfo = cred.AcceptedCredential || cred.Credential;
            console.log(`     - Issuer: ${credInfo.Issuer}`);
            console.log(`       Type: ${credInfo.CredentialType}`);
        }
    }

    console.log("\n🎉 Permissioned Domains created!");

    await client.disconnect();
}

main().catch(console.error);