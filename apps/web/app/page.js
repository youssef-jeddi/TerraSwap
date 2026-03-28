"use client";

import { Header } from "../components/Header";
import { ZoneCard } from "../components/ZoneCard";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { useWallet } from "../components/providers/WalletProvider";
import { useTerraSwap } from "../components/providers/TerraSwapProvider";
import { TERRASWAP_CONFIG } from "../lib/terraswap-config";
import { Button } from "../components/ui/button";
import { CheckCircle2, Clock, XCircle, RefreshCw } from "lucide-react";

export default function Home() {
  const { isConnected, accountInfo } = useWallet();
  const { credentials, pendingCredentials, zoneAccess, xrpBalance, balances, trustLines, isLoading, refreshData } =
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
        <div className="container py-8">
          {!isConnected && (
            <Card className="max-w-lg mx-auto mt-16">
              <CardContent className="pt-10 pb-10 text-center">
                <h2 className="text-lg font-semibold mb-2">Connect Your Wallet</h2>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Connect your XRPL wallet to access regulated stablecoin trading zones.
                  Each zone requires a verified credential from a trusted KYC provider.
                </p>
              </CardContent>
            </Card>
          )}

          {isConnected && (
            <>
              {/* Status Bar */}
              <Card className="mb-8">
                <CardContent className="py-5">
                  <div className="flex flex-wrap items-center gap-6">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Account</p>
                      <p className="text-sm font-mono">
                        {accountInfo?.address?.slice(0, 8)}...{accountInfo?.address?.slice(-6)}
                      </p>
                    </div>

                    <div className="h-10 w-px bg-border" />

                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Credentials</p>
                      <div className="flex items-center gap-2">
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
                    </div>

                    <div className="h-10 w-px bg-border" />

                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Balances</p>
                      <div className="flex items-center gap-4">
                        {isLoading ? (
                          <span className="text-xs text-muted-foreground">Loading...</span>
                        ) : (
                          <>
                            <span className="text-sm font-medium">
                              {parseFloat(xrpBalance).toLocaleString()} XRP
                            </span>
                            <span className="text-muted-foreground">|</span>
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

                    <div className="ml-auto">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={refreshData}
                        disabled={isLoading}
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Zone Cards */}
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-4">Trading Zones</p>
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

      <footer className="border-t border-border py-8">
        <div className="container text-center text-sm text-muted-foreground">
          TerraSwap — Institutional DeFi on XRPL
        </div>
      </footer>
    </div>
  );
}
