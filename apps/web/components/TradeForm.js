"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { useTerraSwapTransactions } from "../hooks/useTerraSwapTransactions";
import { TERRASWAP_CONFIG } from "../lib/terraswap-config";
import { CheckCircle2, XCircle } from "lucide-react";

export function TradeForm({ zone }) {
  const { placeOffer } = useTerraSwapTransactions();
  const [mode, setMode] = useState("sell"); // "sell" = sell stablecoin for XRP, "buy" = buy stablecoin with XRP
  const [stablecoinAmount, setStablecoinAmount] = useState("");
  const [xrpAmount, setXrpAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stablecoinAmount || !xrpAmount) return;

    const iouAmount = {
      currency: zone.currency,
      issuer: TERRASWAP_CONFIG.stablecoinIssuer,
      value: stablecoinAmount,
    };
    const xrpDrops = (parseFloat(xrpAmount) * 1_000_000).toString();

    // In OfferCreate:
    // TakerPays = what you want to receive (what the taker pays you)
    // TakerGets = what you're offering (what the taker gets from you)
    let takerPays, takerGets;

    if (mode === "sell") {
      // Selling stablecoin for XRP: you offer stablecoin, you want XRP
      takerPays = xrpDrops;
      takerGets = iouAmount;
    } else {
      // Buying stablecoin with XRP: you offer XRP, you want stablecoin
      takerPays = iouAmount;
      takerGets = xrpDrops;
    }

    try {
      setIsLoading(true);
      setResult(null);
      const txResult = await placeOffer(zone.id, takerPays, takerGets);
      setResult({ success: true, hash: txResult.hash || "Submitted" });
      setStablecoinAmount("");
      setXrpAmount("");
    } catch (err) {
      setResult({ success: false, error: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <Button
          type="button"
          variant={mode === "sell" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("sell")}
        >
          Sell {zone.currency}
        </Button>
        <Button
          type="button"
          variant={mode === "buy" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("buy")}
        >
          Buy {zone.currency}
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>
              {mode === "sell" ? "Sell" : "Buy"} Amount ({zone.currency})
            </Label>
            <Input
              type="number"
              placeholder="0.00"
              min="0"
              step="any"
              value={stablecoinAmount}
              onChange={(e) => setStablecoinAmount(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>
              {mode === "sell" ? "Receive" : "Pay"} Amount (XRP)
            </Label>
            <Input
              type="number"
              placeholder="0.00"
              min="0"
              step="any"
              value={xrpAmount}
              onChange={(e) => setXrpAmount(e.target.value)}
              required
            />
          </div>
        </div>

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading
            ? "Signing..."
            : mode === "sell"
            ? `Sell ${stablecoinAmount || "0"} ${zone.currency} for ${xrpAmount || "0"} XRP`
            : `Buy ${stablecoinAmount || "0"} ${zone.currency} for ${xrpAmount || "0"} XRP`}
        </Button>
      </form>

      {result && (
        <Alert variant={result.success ? "success" : "destructive"} className="mt-4">
          {result.success ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <AlertTitle>{result.success ? "Offer Placed" : "Offer Failed"}</AlertTitle>
          <AlertDescription>
            {result.success ? (
              <p className="font-mono text-xs break-all">Hash: {result.hash}</p>
            ) : (
              <p>{result.error}</p>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
