"use client";

import { useState } from "react";
import { Header } from "../../components/Header";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { useWallet } from "../../components/providers/WalletProvider";
import { useTerraSwap } from "../../components/providers/TerraSwapProvider";
import { useTerraSwapTransactions } from "../../hooks/useTerraSwapTransactions";
import { TERRASWAP_CONFIG } from "../../lib/terraswap-config";
import { CheckCircle2, Clock, ShieldOff } from "lucide-react";

export default function CredentialsPage() {
  const { isConnected } = useWallet();
  const { credentials, pendingCredentials, isLoading } = useTerraSwap();
  const { acceptCredential } = useTerraSwapTransactions();
  const [accepting, setAccepting] = useState(null);
  const [error, setError] = useState(null);

  const handleAccept = async (credentialTypeHex) => {
    try {
      setAccepting(credentialTypeHex);
      setError(null);
      await acceptCredential(credentialTypeHex);
    } catch (err) {
      setError(err.message);
    } finally {
      setAccepting(null);
    }
  };

  const getStatus = (zone) => {
    const accepted = credentials.some(
      (c) => (c.CredentialType || "").toUpperCase() === zone.credentialTypeHex.toUpperCase()
    );
    if (accepted) return "verified";

    const pending = pendingCredentials.some(
      (c) => (c.CredentialType || "").toUpperCase() === zone.credentialTypeHex.toUpperCase()
    );
    if (pending) return "pending";

    return "none";
  };

  const zones = Object.values(TERRASWAP_CONFIG.zones);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="container py-8">
          <div className="mb-8">
            <h1 className="text-xl font-semibold tracking-tight">Credential Wallet</h1>
            <p className="text-muted-foreground text-sm">
              Your verified credentials for accessing regulated trading zones.
            </p>
          </div>

          {!isConnected && (
            <Card className="max-w-lg mx-auto mt-8">
              <CardContent className="py-10 text-center">
                <p className="text-muted-foreground">
                  Connect your wallet to view your credentials.
                </p>
              </CardContent>
            </Card>
          )}

          {isConnected && isLoading && (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-muted-foreground">Loading credentials...</p>
              </CardContent>
            </Card>
          )}

          {isConnected && !isLoading && (
            <div className="grid gap-6 md:grid-cols-2">
              {zones.map((zone) => {
                const status = getStatus(zone);
                return (
                  <Card key={zone.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <span className="text-3xl">{zone.flag}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="text-base font-semibold">{zone.credentialType}</h3>
                            {status === "verified" && (
                              <Badge variant="success">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                            )}
                            {status === "pending" && (
                              <Badge variant="warning">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                            {status === "none" && (
                              <Badge variant="secondary">
                                <ShieldOff className="h-3 w-3 mr-1" />
                                Not Verified
                              </Badge>
                            )}
                          </div>

                          <div className="space-y-2 mt-3 pt-3 border-t border-border">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Zone</span>
                              <span className="font-medium">{zone.name}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Currency</span>
                              <span className="font-medium">{zone.currency} ({zone.currencyName})</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Issuer</span>
                              <span className="font-mono text-xs">
                                {TERRASWAP_CONFIG.kycIssuer.slice(0, 8)}...{TERRASWAP_CONFIG.kycIssuer.slice(-6)}
                              </span>
                            </div>
                          </div>

                          {status === "pending" && (
                            <Button
                              className="w-full mt-4"
                              onClick={() => handleAccept(zone.credentialTypeHex)}
                              disabled={accepting === zone.credentialTypeHex}
                            >
                              {accepting === zone.credentialTypeHex ? "Signing..." : "Accept Credential"}
                            </Button>
                          )}

                          {status === "none" && (
                            <p className="text-sm text-muted-foreground mt-4">
                              Request verification from a KYC provider to access the {zone.name}.
                            </p>
                          )}
                        </div>
                      </div>

                      {error && accepting === zone.credentialTypeHex && (
                        <p className="text-sm text-destructive mt-3">{error}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
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
