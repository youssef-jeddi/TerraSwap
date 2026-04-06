import { NextResponse } from "next/server";
import { rpc, getXrpl, submitTx, stringToHex } from "../../../lib/xrpl-server";

// Admin seeds — Devnet only
const SEEDS = {
  kycIssuer: "sEdV5Snz67FqU193oaMrJQwrcBSnpzD",
  stablecoinIssuer: "sEdSXwFoXWgXHHwqAVvv4gxLAuMUvjK",
  alice: "sEdTo6k2UJ42ykA1C4HJBHM6cBuc6yq",
  bob: "sEdTEjr5XvHNPcVqqtUQHAJe2pdf134",
};

const STABLECOIN_ISSUER_ADDRESS = "rDNKkhVt7xdq3UQu5C3xHTzjcQa7tUNq4U";

const ZONES = {
  swiss: {
    currency: "CHF",
    domainId: "CDE0D2D90EDE60D0903D424055C03EC39F6EA9582AF7E1FA255C688ADD1FAB9A",
    counterpartySeed: SEEDS.alice,
  },
  eu: {
    currency: "EUR",
    domainId: "F29205DF25B6853B4CF01CBF7D666DC28A0C2D5E9ED0FCA393AC2A1DECBEC981",
    counterpartySeed: SEEDS.bob,
  },
};

export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;
    const xrpl = await getXrpl();

    switch (action) {
      case "issueCredential": {
        const { address, credentialType } = body;
        const wallet = xrpl.Wallet.fromSeed(SEEDS.kycIssuer);
        const tx = {
          TransactionType: "CredentialCreate",
          Account: wallet.address,
          Subject: address,
          CredentialType: stringToHex(credentialType),
        };
        const result = await submitTx(tx, wallet);
        const status = result.meta?.TransactionResult;
        return NextResponse.json({ success: status === "tesSUCCESS", status });
      }

      case "deleteCredential": {
        const { address, credentialType } = body;
        const wallet = xrpl.Wallet.fromSeed(SEEDS.kycIssuer);
        const tx = {
          TransactionType: "CredentialDelete",
          Account: wallet.address,
          Subject: address,
          CredentialType: stringToHex(credentialType),
        };
        const result = await submitTx(tx, wallet);
        const status = result.meta?.TransactionResult;
        return NextResponse.json({ success: status === "tesSUCCESS", status });
      }

      case "sendStablecoins": {
        const { address, currency, amount } = body;
        const wallet = xrpl.Wallet.fromSeed(SEEDS.stablecoinIssuer);
        const tx = {
          TransactionType: "Payment",
          Account: wallet.address,
          Destination: address,
          Amount: { currency, issuer: wallet.address, value: amount },
        };
        const result = await submitTx(tx, wallet);
        const status = result.meta?.TransactionResult;
        let error = null;
        if (status === "tecPATH_DRY") {
          error = "The recipient may not have a trust line for this currency.";
        }
        return NextResponse.json({ success: status === "tesSUCCESS", status, error });
      }

      case "placeCounterpartyOffer": {
        const { zoneId, side, stablecoinAmount, xrpAmount } = body;
        const zone = ZONES[zoneId];
        if (!zone) return NextResponse.json({ success: false, error: "Invalid zone" }, { status: 400 });

        const counterpartyWallet = xrpl.Wallet.fromSeed(zone.counterpartySeed);

        // Check trust line
        let lines;
        try {
          const linesResult = await rpc("account_lines", { account: counterpartyWallet.address });
          lines = linesResult.lines || [];
        } catch {
          lines = [];
        }

        const hasTrustLine = lines.some(
          (l) => l.currency === zone.currency && l.account === STABLECOIN_ISSUER_ADDRESS
        );
        if (!hasTrustLine) {
          await submitTx({
            TransactionType: "TrustSet",
            Account: counterpartyWallet.address,
            LimitAmount: {
              currency: zone.currency,
              issuer: STABLECOIN_ISSUER_ADDRESS,
              value: "1000000",
            },
          }, counterpartyWallet);
        }

        // Fund counterparty if selling stablecoins
        if (side === "sell") {
          const balance = lines.find(
            (l) => l.currency === zone.currency && l.account === STABLECOIN_ISSUER_ADDRESS
          );
          const currentBalance = balance ? parseFloat(balance.balance) : 0;
          if (currentBalance < parseFloat(stablecoinAmount)) {
            const issuerWallet = xrpl.Wallet.fromSeed(SEEDS.stablecoinIssuer);
            await submitTx({
              TransactionType: "Payment",
              Account: issuerWallet.address,
              Destination: counterpartyWallet.address,
              Amount: {
                currency: zone.currency,
                issuer: issuerWallet.address,
                value: stablecoinAmount,
              },
            }, issuerWallet);
          }
        }

        // Build offer
        const iouAmount = {
          currency: zone.currency,
          issuer: STABLECOIN_ISSUER_ADDRESS,
          value: stablecoinAmount,
        };
        const xrpDrops = xrpl.xrpToDrops(xrpAmount);

        let takerPays, takerGets;
        if (side === "buy") {
          takerPays = iouAmount;
          takerGets = xrpDrops;
        } else {
          takerPays = xrpDrops;
          takerGets = iouAmount;
        }

        const result = await submitTx({
          TransactionType: "OfferCreate",
          Account: counterpartyWallet.address,
          TakerPays: takerPays,
          TakerGets: takerGets,
          DomainID: zone.domainId,
        }, counterpartyWallet);

        const status = result.meta?.TransactionResult;
        const counterparty = zoneId === "swiss" ? "alice" : "bob";
        return NextResponse.json({ success: status === "tesSUCCESS", status, counterparty });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
