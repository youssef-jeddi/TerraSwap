import { NextResponse } from "next/server";
import { getXrpl, submitTx, stringToHex } from "../../../lib/xrpl-server";
import { flattenVerifiedClaims, determineCredentialType } from "../../../lib/jurisdictionRules";
import { ADMIN_SEEDS } from "../../../lib/admin-config";

const EDEL_ID_URL = process.env.EDEL_ID_VERIFIER_URL || "https://verifier.edel-id.ch";
const EDEL_ID_API_KEY = process.env.EDEL_ID_API_KEY;
const EDEL_ID_API_SECRET = process.env.EDEL_ID_API_SECRET;
const MOCK_KYC = process.env.MOCK_KYC === "true";

// SWIYU (Swiss) uses $.prefix, EUDI (EU) uses bare names
const ZONE_CONFIG = {
  swiss: {
    path: "ch",
    claims: ["$.age_over_18", "$.given_name", "$.family_name"],
  },
  eu: {
    path: "eu",
    claims: ["given_name", "family_name", "issuing_country"],
  },
};

// Mock session store (module-level, cleared on server restart)
const mockSessions = new Map();

function edelIdHeaders() {
  return {
    "Content-Type": "application/json",
    "X-API-KEY": EDEL_ID_API_KEY,
    "X-API-SECRET": EDEL_ID_API_SECRET,
  };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "startVerification": {
        const { zone } = body;
        const config = ZONE_CONFIG[zone] || ZONE_CONFIG.swiss;

        if (MOCK_KYC || zone === "eu") {
          const sessionId = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          mockSessions.set(sessionId, { createdAt: Date.now(), zone });
          return NextResponse.json({
            sessionId,
            verificationUrl: `mock://${sessionId}`,
            verificationUri: `mock://${sessionId}`,
          });
        }

        const res = await fetch(`${EDEL_ID_URL}/api/verification/${config.path}`, {
          method: "POST",
          headers: edelIdHeaders(),
          body: JSON.stringify({ verificationClaims: config.claims }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Edel-ID API error (${res.status}): ${text}`);
        }

        const data = await res.json();
        return NextResponse.json({
          sessionId: data.id,
          verificationUrl: data.verificationUrl,
          verificationUri: data.verificationUri,
          zone,
        });
      }

      case "completeVerification": {
        const { sessionId, walletAddress, zone } = body;
        if (!sessionId || !walletAddress) {
          return NextResponse.json(
            { approved: false, reason: "Missing sessionId or walletAddress" },
            { status: 400 }
          );
        }

        const config = ZONE_CONFIG[zone] || ZONE_CONFIG.swiss;
        let claims;

        if (MOCK_KYC || zone === "eu") {
          const session = mockSessions.get(sessionId);
          const mockZone = session?.zone || zone;
          await new Promise((r) => setTimeout(r, 5000));
          claims = mockZone === "eu"
            ? { age_over_18: true, issuing_country: "DE", given_name: "Max", family_name: "Mustermann" }
            : { age_over_18: true, issuing_country: "CH", given_name: "Hans", family_name: "Muster" };
          mockSessions.delete(sessionId);
        } else {
          // Blocking GET — waits until wallet responds (up to 5 min)
          const res = await fetch(`${EDEL_ID_URL}/api/verification/${config.path}/${sessionId}/blocking`, {
            method: "GET",
            headers: {
              "X-API-KEY": EDEL_ID_API_KEY,
              "X-API-SECRET": EDEL_ID_API_SECRET,
            },
          });

          if (!res.ok) {
            const text = await res.text();
            throw new Error(`Edel-ID API error (${res.status}): ${text}`);
          }

          const data = await res.json();

          if (data.state !== "SUCCESS") {
            return NextResponse.json({
              approved: false,
              reason: "Verification failed or was declined by the wallet.",
            });
          }

          claims = flattenVerifiedClaims(data.verifiedClaims);
        }

        // Apply jurisdiction rules
        const result = determineCredentialType(claims);

        if (!result.approved) {
          return NextResponse.json({
            approved: false,
            reason: result.reason,
            verifiedName: `${claims.given_name || ""} ${claims.family_name || ""}`.trim(),
            verifiedCountry: claims.issuing_country || claims.nationality || "CH",
          });
        }

        // Issue XRPL credential
        const xrpl = await getXrpl();
        const wallet = xrpl.Wallet.fromSeed(ADMIN_SEEDS.kycIssuer);
        const tx = {
          TransactionType: "CredentialCreate",
          Account: wallet.address,
          Subject: walletAddress,
          CredentialType: stringToHex(result.credentialType),
        };
        const txResult = await submitTx(tx, wallet);
        const txStatus = txResult.meta?.TransactionResult;

        if (txStatus !== "tesSUCCESS") {
          return NextResponse.json({
            approved: false,
            reason: `Credential issuance failed on XRPL: ${txStatus}`,
          });
        }

        return NextResponse.json({
          approved: true,
          credentialType: result.credentialType,
          zone: result.zone,
          verifiedName: `${claims.given_name || ""} ${claims.family_name || ""}`.trim(),
          verifiedCountry: claims.issuing_country || claims.nationality || "CH",
        });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ approved: false, error: err.message }, { status: 500 });
  }
}
