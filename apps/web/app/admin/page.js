"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "../../components/Header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "../../components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import { useXrplClient } from "../../components/providers/XrplClientProvider";
import { useAdminTransactions } from "../../hooks/useAdminTransactions";
import { TERRASWAP_CONFIG } from "../../lib/terraswap-config";
import {
  ArrowLeft,
  ShieldCheck,
  Coins,
  Users,
  ArrowRightLeft,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";

function IssueCredentialTab() {
  const { issueCredential } = useAdminTransactions();
  const [address, setAddress] = useState("");
  const [credType, setCredType] = useState("SwissKYC");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!address.trim()) return;

    setIsSubmitting(true);
    setResult(null);
    try {
      const res = await issueCredential(address.trim(), credType);
      setResult(res);
      if (res.success) setAddress("");
    } catch (err) {
      setResult({ success: false, error: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          Issue Credential
        </CardTitle>
        <CardDescription>
          Issue a KYC credential to any XRPL address. The recipient must accept it via the app.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cred-address">Recipient Address</Label>
            <Input
              id="cred-address"
              placeholder="rXXXX..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Credential Type</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={credType === "SwissKYC" ? "default" : "outline"}
                size="sm"
                onClick={() => setCredType("SwissKYC")}
              >
                SwissKYC
              </Button>
              <Button
                type="button"
                variant={credType === "MiCAKYC" ? "default" : "outline"}
                size="sm"
                onClick={() => setCredType("MiCAKYC")}
              >
                MiCAKYC
              </Button>
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting || !address.trim()}>
            {isSubmitting ? "Submitting..." : `Issue ${credType}`}
          </Button>

          {result && (
            <Alert variant={result.success ? "success" : "destructive"}>
              {result.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertTitle>{result.success ? "Credential Issued" : "Failed"}</AlertTitle>
              <AlertDescription>
                {result.success
                  ? `${credType} credential issued. The recipient can now accept it in the app.`
                  : result.error}
              </AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

function SendStablecoinsTab() {
  const { sendStablecoins } = useAdminTransactions();
  const [address, setAddress] = useState("");
  const [currency, setCurrency] = useState("CHF");
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!address.trim() || !amount) return;

    setIsSubmitting(true);
    setResult(null);
    try {
      const res = await sendStablecoins(address.trim(), currency, amount);
      setResult(res);
      if (res.success) setAmount("");
    } catch (err) {
      setResult({ success: false, error: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Coins className="h-4 w-4" />
          Send Stablecoins
        </CardTitle>
        <CardDescription>
          Send CHF or EUR stablecoins to any address. The recipient must have a trust line set up first.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="send-address">Recipient Address</Label>
            <Input
              id="send-address"
              placeholder="rXXXX..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Currency</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={currency === "CHF" ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrency("CHF")}
              >
                CHF
              </Button>
              <Button
                type="button"
                variant={currency === "EUR" ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrency("EUR")}
              >
                EUR
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="send-amount">Amount</Label>
            <Input
              id="send-amount"
              type="number"
              placeholder="1000"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={isSubmitting || !address.trim() || !amount}>
            {isSubmitting ? "Sending..." : `Send ${amount || "0"} ${currency}`}
          </Button>

          {result && (
            <Alert variant={result.success ? "success" : "destructive"}>
              {result.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertTitle>{result.success ? "Stablecoins Sent" : "Failed"}</AlertTitle>
              <AlertDescription>
                {result.success
                  ? `${amount} ${currency} sent successfully.`
                  : result.error}
              </AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

function CredentialHoldersTab() {
  const { fetchCredentialHolders, deleteCredential } = useAdminTransactions();
  const { isConnected } = useXrplClient();
  const [holders, setHolders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [revoking, setRevoking] = useState(null);
  const [result, setResult] = useState(null);

  const loadHolders = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      const creds = await fetchCredentialHolders();
      setHolders(creds);
    } catch (err) {
      setResult({ success: false, error: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      loadHolders();
    }
  }, [isConnected]);

  const handleRevoke = async (subject, credentialType) => {
    const key = `${subject}-${credentialType}`;
    setRevoking(key);
    setResult(null);
    try {
      const res = await deleteCredential(subject, credentialType);
      if (res.success) {
        setHolders((prev) =>
          prev.filter((h) => !(h.subject === subject && h.credentialType === credentialType))
        );
        setResult({ success: true });
      } else {
        setResult(res);
      }
    } catch (err) {
      setResult({ success: false, error: err.message });
    } finally {
      setRevoking(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Credential Holders
            </CardTitle>
            <CardDescription>
              All credentials issued by the KYC Issuer. {holders.length} credential{holders.length !== 1 ? "s" : ""} found.
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={loadHolders} disabled={isLoading}>
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {holders.length === 0 && !isLoading ? (
          <p className="text-sm text-muted-foreground">No credentials issued yet.</p>
        ) : (
          <div className="space-y-1">
            <div className="grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground border-b pb-2">
              <span>Subject</span>
              <span>Credential</span>
              <span>Status</span>
              <span className="text-right">Action</span>
            </div>

            {holders.map((holder) => {
              const key = `${holder.subject}-${holder.credentialType}`;
              return (
                <div
                  key={key}
                  className="grid grid-cols-4 gap-2 items-center text-sm py-2 border-b last:border-0"
                >
                  <span className="font-mono text-xs truncate" title={holder.subject}>
                    {holder.subject.slice(0, 6)}...{holder.subject.slice(-6)}
                  </span>
                  <Badge variant="outline" className="w-fit text-xs">
                    {holder.credentialType}
                  </Badge>
                  {holder.accepted ? (
                    <Badge variant="success" className="w-fit text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Accepted
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="w-fit text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  )}
                  <div className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => handleRevoke(holder.subject, holder.credentialType)}
                      disabled={revoking === key}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      {revoking === key ? "Revoking..." : "Revoke"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {result && (
          <Alert variant={result.success ? "success" : "destructive"} className="mt-4">
            {result.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertTitle>{result.success ? "Credential Revoked" : "Failed"}</AlertTitle>
            <AlertDescription>
              {result.success ? "Credential deleted successfully." : result.error}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function CounterpartyOfferTab() {
  const { placeCounterpartyOffer } = useAdminTransactions();
  const [zoneId, setZoneId] = useState("swiss");
  const [side, setSide] = useState("buy");
  const [stablecoinAmount, setStablecoinAmount] = useState("");
  const [xrpAmount, setXrpAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const zone = TERRASWAP_CONFIG.zones[zoneId];
  const counterpartyName = zoneId === "swiss" ? "alice" : "bob";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stablecoinAmount || !xrpAmount) return;

    setIsSubmitting(true);
    setResult(null);
    try {
      const res = await placeCounterpartyOffer(zoneId, side, stablecoinAmount, xrpAmount);
      setResult(res);
      if (res.success) {
        setStablecoinAmount("");
        setXrpAmount("");
      }
    } catch (err) {
      setResult({ success: false, error: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ArrowRightLeft className="h-4 w-4" />
          Place Counterparty Offer
        </CardTitle>
        <CardDescription>
          Place an opposing offer from a pre-seeded account so user orders get matched.
          Using <strong>{counterpartyName}</strong> ({zone.counterparty.slice(0, 6)}...{zone.counterparty.slice(-4)}).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Zone</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={zoneId === "swiss" ? "default" : "outline"}
                size="sm"
                onClick={() => setZoneId("swiss")}
              >
                Swiss (CHF)
              </Button>
              <Button
                type="button"
                variant={zoneId === "eu" ? "default" : "outline"}
                size="sm"
                onClick={() => setZoneId("eu")}
              >
                EU (EUR)
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Side</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={side === "buy" ? "default" : "outline"}
                size="sm"
                className={side === "buy" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                onClick={() => setSide("buy")}
              >
                Buy {zone.currency}
              </Button>
              <Button
                type="button"
                variant={side === "sell" ? "default" : "outline"}
                size="sm"
                className={side === "sell" ? "bg-red-600 hover:bg-red-700" : ""}
                onClick={() => setSide("sell")}
              >
                Sell {zone.currency}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="offer-stablecoin">{zone.currency} Amount</Label>
              <Input
                id="offer-stablecoin"
                type="number"
                placeholder="50"
                min="0"
                step="any"
                value={stablecoinAmount}
                onChange={(e) => setStablecoinAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="offer-xrp">XRP Amount</Label>
              <Input
                id="offer-xrp"
                type="number"
                placeholder="25"
                min="0"
                step="any"
                value={xrpAmount}
                onChange={(e) => setXrpAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="text-sm text-muted-foreground bg-muted rounded-md p-3">
            {side === "buy"
              ? `${counterpartyName} will offer ${xrpAmount || "?"} XRP to buy ${stablecoinAmount || "?"} ${zone.currency}`
              : `${counterpartyName} will offer ${stablecoinAmount || "?"} ${zone.currency} to buy ${xrpAmount || "?"} XRP`}
          </div>

          <Button type="submit" disabled={isSubmitting || !stablecoinAmount || !xrpAmount}>
            {isSubmitting ? "Placing Offer..." : "Place Counterparty Offer"}
          </Button>

          {result && (
            <Alert variant={result.success ? "success" : "destructive"}>
              {result.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertTitle>{result.success ? "Offer Placed" : "Failed"}</AlertTitle>
              <AlertDescription>
                {result.success
                  ? `Counterparty offer placed via ${result.counterparty}. If the user has a matching order, it should have filled.`
                  : result.error}
              </AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const { isConnected } = useXrplClient();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="container py-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4 -ml-2">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
            </Button>
          </Link>

          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">Admin Panel</h1>
            <p className="text-muted-foreground text-sm">
              Manage credentials, stablecoins, and counterparty offers for the TerraSwap demo.
            </p>
          </div>

          {!isConnected ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">Connecting to XRPL Devnet...</p>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="credentials" className="space-y-4">
              <TabsList>
                <TabsTrigger value="credentials">
                  <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                  Issue Credential
                </TabsTrigger>
                <TabsTrigger value="stablecoins">
                  <Coins className="h-3.5 w-3.5 mr-1.5" />
                  Send Stablecoins
                </TabsTrigger>
                <TabsTrigger value="holders">
                  <Users className="h-3.5 w-3.5 mr-1.5" />
                  Holders
                </TabsTrigger>
                <TabsTrigger value="counterparty">
                  <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" />
                  Counterparty
                </TabsTrigger>
              </TabsList>

              <TabsContent value="credentials">
                <IssueCredentialTab />
              </TabsContent>

              <TabsContent value="stablecoins">
                <SendStablecoinsTab />
              </TabsContent>

              <TabsContent value="holders">
                <CredentialHoldersTab />
              </TabsContent>

              <TabsContent value="counterparty">
                <CounterpartyOfferTab />
              </TabsContent>
            </Tabs>
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
