"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "../../../components/Header";
import { TradeForm } from "../../../components/TradeForm";
import { OrderBook } from "../../../components/OrderBook";
import { OpenOffers } from "../../../components/OpenOffers";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../components/ui/card";
import { useWallet } from "../../../components/providers/WalletProvider";
import { useTerraSwap } from "../../../components/providers/TerraSwapProvider";
import { useTerraSwapTransactions } from "../../../hooks/useTerraSwapTransactions";
import { TERRASWAP_CONFIG, ZONE_IDS } from "../../../lib/terraswap-config";
import {
  ArrowLeft,
  Lock,
  CheckCircle2,
  Clock,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

export default function ZonePage({ params }) {
  const { id } = params;
  const { isConnected } = useWallet();
  const {
    credentials,
    pendingCredentials,
    zoneAccess,
    balances,
    trustLines,
    offers,
    isLoading,
    refreshData,
  } = useTerraSwap();
  const { acceptCredential, setupTrustLine } = useTerraSwapTransactions();

  const [isAccepting, setIsAccepting] = useState(false);
  const [isSettingTrust, setIsSettingTrust] = useState(false);
  const [error, setError] = useState(null);

  if (!ZONE_IDS.includes(id)) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <p className="text-muted-foreground">Zone not found.</p>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mt-3">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </Link>
        </main>
      </div>
    );
  }

  const zone = TERRASWAP_CONFIG.zones[id];
  const hasAccess = zoneAccess[id];
  const hasTrustLine = trustLines[zone.currency];
  const balance = balances[zone.currency];

  const pendingCred = pendingCredentials.find(
    (c) => c.CredentialType === zone.credentialTypeHex
  );

  const zoneOffers = offers.filter((offer) => {
    const pays = offer.taker_pays;
    const gets = offer.taker_gets;
    const matchesCurrency = (amt) =>
      typeof amt === "object" &&
      amt.currency === zone.currency &&
      amt.issuer === TERRASWAP_CONFIG.stablecoinIssuer;
    return matchesCurrency(pays) || matchesCurrency(gets);
  });

  const handleAcceptCredential = async () => {
    try {
      setIsAccepting(true);
      setError(null);
      await acceptCredential(zone.credentialTypeHex);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAccepting(false);
    }
  };

  const handleSetupTrustLine = async () => {
    try {
      setIsSettingTrust(true);
      setError(null);
      await setupTrustLine(zone.currency);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSettingTrust(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="container py-8">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-6">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </Link>

          <div className="flex items-center gap-3 mb-8">
            <span className="text-2xl">{zone.flag}</span>
            <div className="flex-1">
              <h1 className="text-xl font-semibold tracking-tight">{zone.name} — {zone.currency} Markets</h1>
              <p className="text-muted-foreground text-sm">{zone.description}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={refreshData}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {!isConnected && (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-muted-foreground">Connect your wallet to access this zone.</p>
              </CardContent>
            </Card>
          )}

          {isConnected && isLoading && (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-muted-foreground">Loading zone data...</p>
              </CardContent>
            </Card>
          )}

          {isConnected && !isLoading && (
            <div className="space-y-6">
              {/* Access Gate */}
              {!hasAccess && (
                <Card className={pendingCred ? "border-l-4 border-l-amber-400" : ""}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      {pendingCred ? (
                        <Clock className="h-4 w-4 text-amber-500" />
                      ) : (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      )}
                      {pendingCred ? "Credential Pending Acceptance" : "Access Required"}
                    </CardTitle>
                    <CardDescription>
                      {pendingCred
                        ? `A ${zone.credentialType} credential has been issued to your account. Accept it to unlock this zone.`
                        : `You need a ${zone.credentialType} credential to trade in this zone. Contact a KYC provider to get verified.`}
                    </CardDescription>
                  </CardHeader>
                  {pendingCred && (
                    <CardContent>
                      <Button onClick={handleAcceptCredential} disabled={isAccepting}>
                        {isAccepting ? "Signing..." : `Accept ${zone.credentialType} Credential`}
                      </Button>
                      {error && <p className="text-sm text-destructive mt-2">{error}</p>}
                    </CardContent>
                  )}
                </Card>
              )}

              {/* Credential verified indicator */}
              {hasAccess && (
                <div className="flex items-center gap-2 text-sm py-3 px-4 rounded-lg bg-emerald-50/50 border border-emerald-200/50">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span className="font-medium">{zone.credentialType} credential verified</span>
                  <Badge variant="success">Access Granted</Badge>
                </div>
              )}

              {/* Trust Line */}
              {hasAccess && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Trust Lines</CardTitle>
                    <CardDescription>
                      Trust lines allow your account to hold {zone.currency} stablecoins.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{zone.currency}</span>
                        <span className="text-sm text-muted-foreground ml-1.5">({zone.currencyName})</span>
                      </div>
                      {hasTrustLine ? (
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium">
                            {parseFloat(balance).toLocaleString()} {zone.currency}
                          </span>
                          <Badge variant="success">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSetupTrustLine}
                          disabled={isSettingTrust}
                        >
                          {isSettingTrust ? "Signing..." : `Setup ${zone.currency} Trust Line`}
                        </Button>
                      )}
                    </div>
                    {error && <p className="text-sm text-destructive mt-2">{error}</p>}
                  </CardContent>
                </Card>
              )}

              {/* Trade + Order Book side by side */}
              {hasAccess && hasTrustLine && (
                <div className="grid gap-6 lg:grid-cols-5">
                  <Card className="lg:col-span-3">
                    <CardHeader>
                      <CardTitle className="text-base">Trade {zone.currency}/XRP</CardTitle>
                      <CardDescription>
                        Place orders on the permissioned DEX within the {zone.name}.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <TradeForm zone={zone} />
                    </CardContent>
                  </Card>
                  <div className="lg:col-span-2">
                    <OrderBook zone={zone} />
                  </div>
                </div>
              )}

              {/* Open Offers */}
              {hasAccess && hasTrustLine && (
                <OpenOffers zone={zone} offers={zoneOffers} />
              )}
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
