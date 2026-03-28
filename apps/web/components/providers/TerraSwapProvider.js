"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useWallet } from "./WalletProvider";
import { useXrplClient } from "./XrplClientProvider";
import { TERRASWAP_CONFIG } from "../../lib/terraswap-config";

const TerraSwapContext = createContext(undefined);

const ACCEPTED_FLAG = 0x10000;

export function TerraSwapProvider({ children }) {
  const { accountInfo, isConnected } = useWallet();
  const { getClient, isConnected: clientConnected } = useXrplClient();

  const [credentials, setCredentials] = useState([]);
  const [pendingCredentials, setPendingCredentials] = useState([]);
  const [zoneAccess, setZoneAccess] = useState({ swiss: false, eu: false });
  const [xrpBalance, setXrpBalance] = useState("0");
  const [balances, setBalances] = useState({ CHF: "0", EUR: "0" });
  const [trustLines, setTrustLines] = useState({ CHF: false, EUR: false });
  const [offers, setOffers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCredentials = useCallback(
    async (client, userAddress) => {
      // Query ALL account objects (type filter may not work for newer object types)
      let allObjects = [];
      try {
        const result = await client.request({
          command: "account_objects",
          account: userAddress,
        });
        allObjects = result.result.account_objects || [];
      } catch (err) {
        console.warn("Could not query account objects:", err.message);
      }

      // Filter to credential objects from our KYC issuer
      const myCredentials = allObjects.filter((obj) => {
        if (obj.LedgerEntryType !== "Credential") return false;
        if (obj.Issuer !== TERRASWAP_CONFIG.kycIssuer) return false;
        // Case-insensitive hex comparison
        const objType = (obj.CredentialType || "").toUpperCase();
        return Object.values(TERRASWAP_CONFIG.zones).some(
          (zone) => zone.credentialTypeHex.toUpperCase() === objType
        );
      });

      console.log("Credential objects found:", myCredentials.length, myCredentials);

      // Split into accepted and pending
      const access = { swiss: false, eu: false };
      const accepted = [];
      const pending = [];

      for (const cred of myCredentials) {
        const isAccepted = (cred.Flags & ACCEPTED_FLAG) !== 0;
        const credType = (cred.CredentialType || "").toUpperCase();
        if (isAccepted) {
          accepted.push(cred);
          for (const [zoneId, zone] of Object.entries(TERRASWAP_CONFIG.zones)) {
            if (zone.credentialTypeHex.toUpperCase() === credType) {
              access[zoneId] = true;
            }
          }
        } else {
          pending.push(cred);
        }
      }

      setCredentials(accepted);
      setPendingCredentials(pending);
      setZoneAccess(access);
    },
    []
  );

  const fetchBalances = useCallback(async (client, userAddress) => {
    const newBalances = { CHF: "0", EUR: "0" };
    const newTrustLines = { CHF: false, EUR: false };

    // Fetch XRP balance
    try {
      const info = await client.request({
        command: "account_info",
        account: userAddress,
      });
      const drops = info.result.account_data.Balance;
      setXrpBalance((parseInt(drops) / 1_000_000).toString());
    } catch (err) {
      console.warn("Could not query XRP balance:", err.message);
    }

    try {
      const lines = await client.request({
        command: "account_lines",
        account: userAddress,
      });

      for (const line of lines.result.lines || []) {
        if (line.account === TERRASWAP_CONFIG.stablecoinIssuer) {
          if (line.currency === "CHF") {
            newBalances.CHF = line.balance;
            newTrustLines.CHF = true;
          } else if (line.currency === "EUR") {
            newBalances.EUR = line.balance;
            newTrustLines.EUR = true;
          }
        }
      }
    } catch (err) {
      console.warn("Could not query account lines:", err.message);
    }

    setBalances(newBalances);
    setTrustLines(newTrustLines);
  }, []);

  const fetchOffers = useCallback(async (client, userAddress) => {
    try {
      const result = await client.request({
        command: "account_offers",
        account: userAddress,
      });
      setOffers(result.result.offers || []);
    } catch (err) {
      console.warn("Could not query account offers:", err.message);
      setOffers([]);
    }
  }, []);

  const refreshData = useCallback(async () => {
    const client = getClient();
    if (!client || !accountInfo?.address) return;

    setIsLoading(true);
    setError(null);

    try {
      await Promise.all([
        fetchCredentials(client, accountInfo.address),
        fetchBalances(client, accountInfo.address),
        fetchOffers(client, accountInfo.address),
      ]);
    } catch (err) {
      console.error("Failed to fetch TerraSwap data:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [getClient, accountInfo?.address, fetchCredentials, fetchBalances, fetchOffers]);

  // Fetch data when wallet connects or client reconnects
  useEffect(() => {
    if (isConnected && clientConnected && accountInfo?.address) {
      refreshData();
    }

    if (!isConnected) {
      // Reset state on disconnect
      setCredentials([]);
      setPendingCredentials([]);
      setZoneAccess({ swiss: false, eu: false });
      setXrpBalance("0");
      setBalances({ CHF: "0", EUR: "0" });
      setTrustLines({ CHF: false, EUR: false });
      setOffers([]);
    }
  }, [isConnected, clientConnected, accountInfo?.address, refreshData]);

  return (
    <TerraSwapContext.Provider
      value={{
        credentials,
        pendingCredentials,
        zoneAccess,
        xrpBalance,
        balances,
        trustLines,
        offers,
        isLoading,
        error,
        refreshData,
      }}
    >
      {children}
    </TerraSwapContext.Provider>
  );
}

export function useTerraSwap() {
  const context = useContext(TerraSwapContext);
  if (context === undefined) {
    throw new Error("useTerraSwap must be used within a TerraSwapProvider");
  }
  return context;
}
