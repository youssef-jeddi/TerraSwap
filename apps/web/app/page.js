"use client";

import { Header } from "../components/Header";
import { ZoneCard } from "../components/ZoneCard";
import { Badge } from "../components/ui/badge";
import { useWallet } from "../components/providers/WalletProvider";
import { useTerraSwap } from "../components/providers/TerraSwapProvider";
import { TERRASWAP_CONFIG } from "../lib/terraswap-config";
import { Button } from "../components/ui/button";
import { CheckCircle2, Clock, XCircle, Wallet, RefreshCw } from "lucide-react";

export default function Home() {
  const { isConnected, accountInfo } = useWallet();
  const { credentials, pendingCredentials, zoneAccess, balances, trustLines, isLoading, refreshData } =
    useTerraSwap();

  const getCredentialStatus = (zone) => {
    const hasAccepted = credentials.some(
      (c) => c.CredentialType === zone.credentialTypeHex
    );
    if (hasAccepted) return "accepted";

    const hasPending = pendingCredentials.some(
      (c) => c.CredentialType === zone.credentialTypeHex
    );
    if (hasPending) return "pending";

    return "none";
  };

  const getPendingCredential = (zone) => {
    return pendingCredentials.find(
      (c) => c.CredentialType === zone.credentialTypeHex
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="container py-6">
          {/* Hero */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">TerraSwap</h1>
            <p className="text-muted-foreground">
              Jurisdiction-aware credential-gated stablecoin DEX on XRPL
            </p>
          </div>

          {!isConnected && (
            <div className="rounded-lg border bg-card p-8 text-center">
              <Wallet className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-lg font-medium mb-2">Connect Your Wallet</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Connect your XRPL wallet to access regulated trading zones. Each zone requires a
                verified credential from a trusted KYC provider.
              </p>
            </div>
          )}

          {isConnected && (
            <>
              {/* Account + Credentials + Balances */}
              <div className="rounded-lg border bg-card p-4 mb-6">
                <div className="flex flex-wrap items-center gap-4">
                  {/* Refresh */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={refreshData}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                  </Button>

                  {/* Address */}
                  <div className="text-sm">
                    <span className="text-muted-foreground mr-1">Account:</span>
                    <span className="font-mono text-xs">
                      {accountInfo?.address?.slice(0, 8)}...{accountInfo?.address?.slice(-6)}
                    </span>
                  </div>

                  <div className="h-4 w-px bg-border" />

                  {/* Credentials */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Credentials:</span>
                    {isLoading ? (
                      <span className="text-xs text-muted-foreground">Loading...</span>
                    ) : (
                      Object.values(TERRASWAP_CONFIG.zones).map((zone) => {
                        const status = getCredentialStatus(zone);
                        return (
                          <Badge
                            key={zone.id}
                            variant={
                              status === "accepted"
                                ? "success"
                                : status === "pending"
                                ? "warning"
                                : "secondary"
                            }
                          >
                            {status === "accepted" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                            {status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                            {status === "none" && <XCircle className="h-3 w-3 mr-1" />}
                            {zone.credentialType}
                          </Badge>
                        );
                      })
                    )}
                  </div>

                  <div className="h-4 w-px bg-border" />

                  {/* Balances */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">Balances:</span>
                    {isLoading ? (
                      <span className="text-xs text-muted-foreground">Loading...</span>
                    ) : (
                      <>
                        <span className="text-sm font-medium">
                          {trustLines.CHF
                            ? `${parseFloat(balances.CHF).toLocaleString()} CHF`
                            : "CHF --"}
                        </span>
                        <span className="text-sm font-medium">
                          {trustLines.EUR
                            ? `${parseFloat(balances.EUR).toLocaleString()} EUR`
                            : "EUR --"}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Zone Cards */}
              <h2 className="text-lg font-medium mb-4">Trading Zones</h2>
              <div className="grid gap-6 md:grid-cols-2">
                {Object.values(TERRASWAP_CONFIG.zones).map((zone) => (
                  <ZoneCard
                    key={zone.id}
                    zone={zone}
                    hasAccess={zoneAccess[zone.id]}
                    pendingCredential={getPendingCredential(zone)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="border-t py-6">
        <div className="container text-center text-sm text-muted-foreground">
          Built with TerraSwap
        </div>
      </footer>
    </div>
  );
}
