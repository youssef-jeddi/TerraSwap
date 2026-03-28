"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { useTerraSwapTransactions } from "../hooks/useTerraSwapTransactions";
import { TERRASWAP_CONFIG } from "../lib/terraswap-config";
import { CheckCircle2, XCircle, ArrowDownUp } from "lucide-react";

export function TradeForm({ zone }) {
  const { placeOffer } = useTerraSwapTransactions();
  const [mode, setMode] = useState("sell");
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

    let takerPays, takerGets;

    if (mode === "sell") {
      takerPays = xrpDrops;
      takerGets = iouAmount;
    } else {
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

  const toggleMode = () => {
    setMode((m) => (m === "sell" ? "buy" : "sell"));
  };

  const topLabel = mode === "sell" ? "You sell" : "You pay";
  const bottomLabel = mode === "sell" ? "You receive" : "You buy";
  const topCurrency = mode === "sell" ? zone.currency : "XRP";
  const bottomCurrency = mode === "sell" ? "XRP" : zone.currency;
  const topValue = mode === "sell" ? stablecoinAmount : xrpAmount;
  const bottomValue = mode === "sell" ? xrpAmount : stablecoinAmount;
  const setTopValue = (v) => (mode === "sell" ? setStablecoinAmount(v) : setXrpAmount(v));
  const setBottomValue = (v) => (mode === "sell" ? setXrpAmount(v) : setStablecoinAmount(v));

  const buttonLabel = isLoading
    ? "Signing..."
    : mode === "sell"
    ? `Sell ${stablecoinAmount || "0"} ${zone.currency} for ${xrpAmount || "0"} XRP`
    : `Buy ${stablecoinAmount || "0"} ${zone.currency} for ${xrpAmount || "0"} XRP`;

  return (
    <div>
      <form onSubmit={handleSubmit}>
        {/* Top input — sell/pay */}
        <div className="rounded-xl border border-border bg-secondary/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {topLabel}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              placeholder="0"
              min="0"
              step="any"
              value={topValue}
              onChange={(e) => setTopValue(e.target.value)}
              required
              className="flex-1 bg-transparent text-2xl font-semibold text-foreground placeholder:text-muted-foreground/40 outline-none border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <div className="flex items-center gap-2 rounded-full bg-white border border-border px-3 py-1.5 shadow-sm">
              <span className="text-sm font-semibold">{topCurrency}</span>
            </div>
          </div>
        </div>

        {/* Swap button */}
        <div className="flex justify-center -my-3 relative z-10">
          <button
            type="button"
            onClick={toggleMode}
            className="h-9 w-9 rounded-full border-2 border-border bg-white shadow-sm flex items-center justify-center hover:bg-secondary transition-colors duration-150"
          >
            <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Bottom input — receive/buy */}
        <div className="rounded-xl border border-border bg-secondary/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {bottomLabel}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              placeholder="0"
              min="0"
              step="any"
              value={bottomValue}
              onChange={(e) => setBottomValue(e.target.value)}
              required
              className="flex-1 bg-transparent text-2xl font-semibold text-foreground placeholder:text-muted-foreground/40 outline-none border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <div className="flex items-center gap-2 rounded-full bg-white border border-border px-3 py-1.5 shadow-sm">
              <span className="text-sm font-semibold">{bottomCurrency}</span>
            </div>
          </div>
        </div>

        <Button type="submit" disabled={isLoading} className="w-full mt-4 h-12 text-sm font-semibold rounded-xl">
          {buttonLabel}
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
