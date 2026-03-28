"use client";

import { useState, useEffect } from "react";
import { useWallet } from "./providers/WalletProvider";
import { useWalletConnector } from "../hooks/useWalletConnector";

const THEME = {
  "--xc-background-color": "#ffffff",
  "--xc-background-secondary": "#f8f9fb",
  "--xc-background-tertiary": "#f0f2f5",
  "--xc-text-color": "#161b26",
  "--xc-text-muted-color": "rgba(22, 27, 38, 0.5)",
  "--xc-primary-color": "#28808f",
};

export function WalletConnector() {
  const { walletManager } = useWallet();
  const walletConnectorRef = useWalletConnector(walletManager);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    const registerWebComponent = async () => {
      try {
        const { WalletConnectorElement } = await import("xrpl-connect");

        if (!customElements.get("xrpl-wallet-connector")) {
          customElements.define("xrpl-wallet-connector", WalletConnectorElement);
        }
      } catch (error) {
        console.error("Failed to register wallet connector:", error);
      }
    };

    registerWebComponent();
  }, []);

  if (!isClient) {
    return null;
  }

  return (
    <xrpl-wallet-connector
      ref={walletConnectorRef}
      id="wallet-connector"
      style={{
        ...THEME,
        "--xc-font-family": "inherit",
        "--xc-border-radius": "8px",
        "--xc-modal-box-shadow": "0 10px 40px rgba(0, 0, 0, 0.12)",
      }}
      primary-wallet="xaman"
    />
  );
}
