"use client";

import { useCallback } from "react";
import { useXrplClient } from "../components/providers/XrplClientProvider";
import { TERRASWAP_CONFIG } from "../lib/terraswap-config";

const ACCEPTED_FLAG = 0x10000;

async function adminApi(body) {
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok && !data.error) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return data;
}

export function useAdminTransactions() {
  const { getClient } = useXrplClient();

  const issueCredential = useCallback(async (address, credentialType) => {
    const data = await adminApi({ action: "issueCredential", address, credentialType });
    return {
      success: data.success,
      status: data.status,
      error: data.success ? null : data.error || `Transaction failed: ${data.status}`,
    };
  }, []);

  const deleteCredential = useCallback(async (subjectAddress, credentialType) => {
    const data = await adminApi({ action: "deleteCredential", address: subjectAddress, credentialType });
    return {
      success: data.success,
      status: data.status,
      error: data.success ? null : data.error || `Transaction failed: ${data.status}`,
    };
  }, []);

  const sendStablecoins = useCallback(async (address, currency, amount) => {
    const data = await adminApi({ action: "sendStablecoins", address, currency, amount });
    let error = null;
    if (!data.success) {
      error = data.error || `Transaction failed: ${data.status}`;
      if (data.status === "tecPATH_DRY") {
        error += " The recipient may not have a trust line for this currency.";
      }
    }
    return { success: data.success, status: data.status, error };
  }, []);

  const fetchCredentialHolders = useCallback(async () => {
    const client = getClient();
    if (!client) throw new Error("XRPL client not connected");

    const result = await client.request({
      command: "account_objects",
      account: TERRASWAP_CONFIG.kycIssuer,
    });

    const allObjects = result.result.account_objects || [];
    return allObjects
      .filter((obj) => obj.LedgerEntryType === "Credential")
      .map((obj) => {
        const credTypeHex = (obj.CredentialType || "").toUpperCase();
        let credentialType = credTypeHex;

        for (const zone of Object.values(TERRASWAP_CONFIG.zones)) {
          if (zone.credentialTypeHex.toUpperCase() === credTypeHex) {
            credentialType = zone.credentialType;
            break;
          }
        }

        return {
          subject: obj.Subject,
          credentialType,
          credentialTypeHex: credTypeHex,
          accepted: (obj.Flags & ACCEPTED_FLAG) !== 0,
        };
      });
  }, [getClient]);

  const placeCounterpartyOffer = useCallback(async (zoneId, side, stablecoinAmount, xrpAmount) => {
    const data = await adminApi({ action: "placeCounterpartyOffer", zoneId, side, stablecoinAmount, xrpAmount });
    return {
      success: data.success,
      status: data.status,
      counterparty: data.counterparty,
      error: data.success ? null : data.error || `Transaction failed: ${data.status}`,
    };
  }, []);

  return {
    issueCredential,
    deleteCredential,
    sendStablecoins,
    fetchCredentialHolders,
    placeCounterpartyOffer,
  };
}
