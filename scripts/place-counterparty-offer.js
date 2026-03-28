/**
 * TerraSwap - Place Counterparty Offer
 *
 * Places an opposing offer from a funded account so the user's offer fills.
 * Uses the stablecoinIssuer account (which holds unlimited supply) as counterparty.
 *
 * The counterparty also needs a credential for the domain, so we use alice or bob
 * (who already have credentials from the setup scripts).
 *
 * Usage: node scripts/place-counterparty-offer.js <zone> <buy|sell> <stablecoinAmount> <xrpAmount>
 *
 * Examples:
 *   If the user placed "Sell 10 CHF for 5 XRP" in the Swiss Zone, run:
 *     node scripts/place-counterparty-offer.js swiss buy 10 5
 *   (This places the opposite: "Buy 10 CHF for 5 XRP" from alice)
 *
 *   If the user placed "Buy 10 CHF for 5 XRP", run:
 *     node scripts/place-counterparty-offer.js swiss sell 10 5
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

const ZONES = {
    swiss: {
        currency: "CHF",
        credentialType: "SwissKYC",
        counterparty: "alice", // alice has SwissKYC credential
    },
    eu: {
        currency: "EUR",
        credentialType: "MiCAKYC",
        counterparty: "bob", // bob has MiCAKYC credential
    },
};

async function main() {
    const args = process.argv.slice(2);

    if (args.length < 4) {
        console.log("Usage: node scripts/place-counterparty-offer.js <zone> <buy|sell> <stablecoinAmount> <xrpAmount>");
        console.log("");
        console.log("Places the OPPOSITE of what the user placed, so the orders match.");
        console.log("");
        console.log("Examples:");
        console.log("  User sold 10 CHF for 5 XRP  →  node scripts/place-counterparty-offer.js swiss buy 10 5");
        console.log("  User bought 10 EUR for 5 XRP →  node scripts/place-counterparty-offer.js eu sell 10 5");
        process.exit(1);
    }

    const [zoneId, side, stablecoinAmount, xrpAmount] = args;

    if (!ZONES[zoneId]) {
        console.error(`Invalid zone: ${zoneId}. Use: swiss, eu`);
        process.exit(1);
    }

    if (!["buy", "sell"].includes(side)) {
        console.error(`Invalid side: ${side}. Use: buy, sell`);
        process.exit(1);
    }

    const zone = ZONES[zoneId];
    const accounts = loadAccounts();
    const client = new xrpl.Client(DEVNET_URL);
    await client.connect();
    console.log("Connected to Devnet\n");

    // Use the pre-seeded counterparty (alice for swiss, bob for eu)
    const counterpartyWallet = xrpl.Wallet.fromSeed(accounts[zone.counterparty].seed);
    const domainId = accounts.domains[zoneId];

    console.log(`Zone: ${zoneId} (${zone.currency})`);
    console.log(`Counterparty: ${zone.counterparty} (${counterpartyWallet.address})`);
    console.log(`Side: ${side} ${stablecoinAmount} ${zone.currency} for ${xrpAmount} XRP`);
    console.log(`Domain ID: ${domainId}\n`);

    // Ensure counterparty has a trust line for the currency
    const lines = await client.request({
        command: "account_lines",
        account: counterpartyWallet.address,
    });
    const hasTrustLine = lines.result.lines.some(
        (l) => l.currency === zone.currency && l.account === accounts.stablecoinIssuer.address
    );

    if (!hasTrustLine) {
        console.log(`Setting up ${zone.currency} trust line for ${zone.counterparty}...`);
        const trustTx = {
            TransactionType: "TrustSet",
            Account: counterpartyWallet.address,
            LimitAmount: {
                currency: zone.currency,
                issuer: accounts.stablecoinIssuer.address,
                value: "1000000",
            },
        };
        await client.submitAndWait(trustTx, { autofill: true, wallet: counterpartyWallet });
    }

    // Ensure counterparty has enough stablecoins (if selling)
    if (side === "sell") {
        const balance = lines.result.lines.find(
            (l) => l.currency === zone.currency && l.account === accounts.stablecoinIssuer.address
        );
        const currentBalance = balance ? parseFloat(balance.balance) : 0;

        if (currentBalance < parseFloat(stablecoinAmount)) {
            console.log(`Funding ${zone.counterparty} with ${stablecoinAmount} ${zone.currency}...`);
            const issuerWallet = xrpl.Wallet.fromSeed(accounts.stablecoinIssuer.seed);
            const payTx = {
                TransactionType: "Payment",
                Account: issuerWallet.address,
                Destination: counterpartyWallet.address,
                Amount: {
                    currency: zone.currency,
                    issuer: issuerWallet.address,
                    value: stablecoinAmount,
                },
            };
            await client.submitAndWait(payTx, { autofill: true, wallet: issuerWallet });
        }
    }

    // Build the offer
    const iouAmount = {
        currency: zone.currency,
        issuer: accounts.stablecoinIssuer.address,
        value: stablecoinAmount,
    };
    const xrpDrops = xrpl.xrpToDrops(xrpAmount);

    let takerPays, takerGets;

    if (side === "buy") {
        // Counterparty wants to buy stablecoin with XRP
        // Offers XRP (TakerGets), wants stablecoin (TakerPays)
        takerPays = iouAmount;
        takerGets = xrpDrops;
    } else {
        // Counterparty wants to sell stablecoin for XRP
        // Offers stablecoin (TakerGets), wants XRP (TakerPays)
        takerPays = xrpDrops;
        takerGets = iouAmount;
    }

    const offerTx = {
        TransactionType: "OfferCreate",
        Account: counterpartyWallet.address,
        TakerPays: takerPays,
        TakerGets: takerGets,
        DomainID: domainId,
    };

    console.log("Placing counterparty offer...");
    const result = await client.submitAndWait(offerTx, { autofill: true, wallet: counterpartyWallet });
    const status = result.result.meta.TransactionResult;

    if (status === "tesSUCCESS") {
        console.log(`\nCounterparty offer placed successfully!`);
        console.log(`If the user has a matching open offer, it should have filled.`);
        console.log(`Refresh the app to see updated balances and offers.`);
    } else {
        console.log(`\nTransaction result: ${status}`);
    }

    await client.disconnect();
}

main().catch(console.error);
