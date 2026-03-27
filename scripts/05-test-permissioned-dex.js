/**
 * TerraSwap - Script 05: Test Permissioned DEX
 * 
 * This is the KEY test — it verifies that credential-gating works on the DEX.
 * 
 * Tests:
 * 1. Alice (SwissKYC) places an offer in Swiss Domain → should SUCCEED
 * 2. Bob (MiCAKYC, no SwissKYC) places an offer in Swiss Domain → should FAIL
 * 3. Bob (MiCAKYC) places an offer in EU Domain → should SUCCEED
 * 4. Alice (SwissKYC, no MiCAKYC) places an offer in EU Domain → should FAIL
 * 
 * Note: The Permissioned DEX uses OfferCreate with a DomainID field.
 * If the Permissioned DEX amendment is not yet active on Devnet,
 * the DomainID field may not be recognized. In that case, this script
 * documents the expected behavior for your demo.
 * 
 * Run: node scripts/05-test-permissioned-dex.js
 */

import xrpl from "xrpl";
import fs from "fs";

const DEVNET_URL = "wss://s.devnet.rippletest.net:51233";
const ACCOUNTS_FILE = "scripts/accounts.json";

function loadAccounts() {
    if (!fs.existsSync(ACCOUNTS_FILE)) {
        console.error("❌ accounts.json not found. Run previous scripts first.");
        process.exit(1);
    }
    const accounts = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, "utf-8"));
    if (!accounts.domains) {
        console.error("❌ No domains found in accounts.json. Run 04-create-domains.js first.");
        process.exit(1);
    }
    return accounts;
}

async function placePermissionedOffer(client, wallet, domainID, takerPays, takerGets, testName) {
    console.log(`\n📊 Test: ${testName}`);
    console.log(`   Account: ${wallet.address}`);
    console.log(`   Domain:  ${domainID}`);
    console.log(`   Selling: ${JSON.stringify(takerGets)}`);
    console.log(`   Buying:  ${JSON.stringify(takerPays)}`);

    const tx = {
        TransactionType: "OfferCreate",
        Account: wallet.address,
        TakerPays: takerPays,
        TakerGets: takerGets,
        DomainID: domainID,
    };

    try {
        const result = await client.submitAndWait(tx, { autofill: true, wallet });
        const status = result.result.meta.TransactionResult;
        console.log(`   Result: ${status}`);

        if (status === "tesSUCCESS") {
            console.log(`   ✅ Offer placed successfully`);
        } else if (status === "tecNO_PERMISSION") {
            console.log(`   🚫 Access denied — user lacks required credentials for this domain`);
        } else {
            console.log(`   ⚠️  Unexpected result: ${status}`);
        }

        return status;
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);

        // If DomainID is not recognized, the amendment might not be active
        if (error.message.includes("invalidParams") || error.message.includes("unknown field")) {
            console.log(`   ⚠️  The Permissioned DEX amendment may not be active on this network yet.`);
            console.log(`   📝 Document this as expected behavior and simulate in your app layer.`);
        }

        return "error";
    }
}

async function main() {
    const accounts = loadAccounts();
    const client = new xrpl.Client(DEVNET_URL);
    await client.connect();
    console.log("✅ Connected to Devnet");

    const aliceWallet = xrpl.Wallet.fromSeed(accounts.alice.seed);
    const bobWallet = xrpl.Wallet.fromSeed(accounts.bob.seed);
    const issuerAddress = accounts.stablecoinIssuer.address;
    const swissDomainID = accounts.domains.swiss;
    const euDomainID = accounts.domains.eu;

    console.log("\n═══════════════════════════════════════════");
    console.log("  PERMISSIONED DEX TESTS");
    console.log("═══════════════════════════════════════════");

    // Test 1: Alice trades in Swiss Domain (should SUCCEED — she has SwissKYC)
    await placePermissionedOffer(
        client,
        aliceWallet,
        swissDomainID,
        xrpl.xrpToDrops("10"),  // Buying 10 XRP
        { currency: "CHF", issuer: issuerAddress, value: "10" },  // Selling 10 CHF
        "Alice → Swiss Domain (has SwissKYC) → EXPECT SUCCESS"
    );

    // Test 2: Bob trades in Swiss Domain (should FAIL — no SwissKYC)
    await placePermissionedOffer(
        client,
        bobWallet,
        swissDomainID,
        xrpl.xrpToDrops("10"),
        { currency: "CHF", issuer: issuerAddress, value: "10" },
        "Bob → Swiss Domain (no SwissKYC) → EXPECT FAIL"
    );

    // Test 3: Bob trades in EU Domain (should SUCCEED — has MiCAKYC)
    await placePermissionedOffer(
        client,
        bobWallet,
        euDomainID,
        xrpl.xrpToDrops("10"),
        { currency: "EUR", issuer: issuerAddress, value: "10" },
        "Bob → EU Domain (has MiCAKYC) → EXPECT SUCCESS"
    );

    // Test 4: Alice trades in EU Domain (should FAIL — no MiCAKYC)
    await placePermissionedOffer(
        client,
        aliceWallet,
        euDomainID,
        xrpl.xrpToDrops("10"),
        { currency: "EUR", issuer: issuerAddress, value: "10" },
        "Alice → EU Domain (no MiCAKYC) → EXPECT FAIL"
    );

    console.log("\n═══════════════════════════════════════════");
    console.log("  TEST SUMMARY");
    console.log("═══════════════════════════════════════════");
    console.log("If all 4 tests match expectations, your credential-gating works!");
    console.log("This is the core proof of concept for TerraSwap.");

    await client.disconnect();
}

main().catch(console.error);