"use client";

import { useCallback } from "react";
import { useWallet } from "../components/providers/WalletProvider";
import { useTerraSwap } from "../components/providers/TerraSwapProvider";
import { TERRASWAP_CONFIG } from "../lib/terraswap-config";

export function useTerraSwapTransactions() {
  const { walletManager, showStatus, addEvent } = useWallet();
  const { refreshData } = useTerraSwap();

  const acceptCredential = useCallback(
    async (credentialTypeHex) => {
      if (!walletManager?.account) throw new Error("Wallet not connected");

      const tx = {
        TransactionType: "CredentialAccept",
        Account: walletManager.account.address,
        Issuer: TERRASWAP_CONFIG.kycIssuer,
        CredentialType: credentialTypeHex,
      };

      const result = await walletManager.signAndSubmit(tx);
      addEvent("Credential Accepted", result);
      showStatus("Credential accepted successfully!", "success");
      await refreshData();
      return result;
    },
    [walletManager, refreshData, addEvent, showStatus]
  );

  const setupTrustLine = useCallback(
    async (currency) => {
      if (!walletManager?.account) throw new Error("Wallet not connected");

      const tx = {
        TransactionType: "TrustSet",
        Account: walletManager.account.address,
        LimitAmount: {
          currency: currency,
          issuer: TERRASWAP_CONFIG.stablecoinIssuer,
          value: "1000000",
        },
      };

      const result = await walletManager.signAndSubmit(tx);
      addEvent("Trust Line Set", { currency, result });
      showStatus(`Trust line for ${currency} set up successfully!`, "success");
      await refreshData();
      return result;
    },
    [walletManager, refreshData, addEvent, showStatus]
  );

  const placeOffer = useCallback(
    async (zoneId, takerPays, takerGets) => {
      if (!walletManager?.account) throw new Error("Wallet not connected");

      const zone = TERRASWAP_CONFIG.zones[zoneId];
      if (!zone) throw new Error(`Unknown zone: ${zoneId}`);

      const tx = {
        TransactionType: "OfferCreate",
        Account: walletManager.account.address,
        TakerPays: takerPays,
        TakerGets: takerGets,
        DomainID: zone.domainId,
      };

      const result = await walletManager.signAndSubmit(tx);
      addEvent("Offer Created", { zoneId, result });
      showStatus("Offer placed successfully!", "success");
      await refreshData();
      return result;
    },
    [walletManager, refreshData, addEvent, showStatus]
  );

  const cancelOffer = useCallback(
    async (offerSequence) => {
      if (!walletManager?.account) throw new Error("Wallet not connected");

      const tx = {
        TransactionType: "OfferCancel",
        Account: walletManager.account.address,
        OfferSequence: offerSequence,
      };

      const result = await walletManager.signAndSubmit(tx);
      addEvent("Offer Cancelled", result);
      showStatus("Offer cancelled successfully!", "success");
      await refreshData();
      return result;
    },
    [walletManager, refreshData, addEvent, showStatus]
  );

  return { acceptCredential, setupTrustLine, placeOffer, cancelOffer };
}
