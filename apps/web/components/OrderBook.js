"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { useXrplClient } from "./providers/XrplClientProvider";
import { useWallet } from "./providers/WalletProvider";
import { useTerraSwap } from "./providers/TerraSwapProvider";
import { TERRASWAP_CONFIG } from "../lib/terraswap-config";
import { RefreshCw } from "lucide-react";

function formatXrp(drops) {
  return parseFloat((parseInt(drops) / 1_000_000).toFixed(6));
}

function isIou(amount) {
  return typeof amount === "object" && amount.value;
}

function isXrp(amount) {
  return typeof amount === "string";
}

export function OrderBook({ zone }) {
  const { getClient, isConnected: clientConnected } = useXrplClient();
  const { accountInfo } = useWallet();
  const { offers: userOffers } = useTerraSwap();
  const [allOrders, setAllOrders] = useState({ sells: [], buys: [] });
  const [isLoading, setIsLoading] = useState(false);

  const fetchOrderBook = useCallback(async () => {
    const client = getClient();
    if (!client) return;

    setIsLoading(true);
    try {
      const accountsToQuery = [zone.counterparty];
      if (accountInfo?.address) {
        accountsToQuery.push(accountInfo.address);
      }

      const results = await Promise.all(
        accountsToQuery.map(async (account) => {
          try {
            const result = await client.request({
              command: "account_offers",
              account,
            });
            return (result.result.offers || []).map((offer) => ({
              ...offer,
              Account: account,
            }));
          } catch {
            return [];
          }
        })
      );

      const allOffers = results.flat();

      const zoneOffers = allOffers.filter((offer) => {
        const pays = offer.taker_pays;
        const gets = offer.taker_gets;
        const matchesCurrency = (amt) =>
          isIou(amt) &&
          amt.currency === zone.currency &&
          amt.issuer === TERRASWAP_CONFIG.stablecoinIssuer;
        return matchesCurrency(pays) || matchesCurrency(gets);
      });

      const sells = [];
      const buys = [];

      for (const offer of zoneOffers) {
        const pays = offer.taker_pays;
        const gets = offer.taker_gets;

        if (isIou(gets) && gets.currency === zone.currency) {
          const stablecoinAmount = parseFloat(gets.value);
          const xrpAmount = isXrp(pays) ? formatXrp(pays) : 0;
          const price = stablecoinAmount > 0 ? (xrpAmount / stablecoinAmount).toFixed(4) : "0";
          sells.push({
            account: offer.Account,
            stablecoinAmount,
            xrpAmount,
            price,
            seq: offer.seq,
            side: "sell",
          });
        } else if (isIou(pays) && pays.currency === zone.currency) {
          const stablecoinAmount = parseFloat(pays.value);
          const xrpAmount = isXrp(gets) ? formatXrp(gets) : 0;
          const price = stablecoinAmount > 0 ? (xrpAmount / stablecoinAmount).toFixed(4) : "0";
          buys.push({
            account: offer.Account,
            stablecoinAmount,
            xrpAmount,
            price,
            seq: offer.seq,
            side: "buy",
          });
        }
      }

      sells.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
      buys.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));

      setAllOrders({ sells, buys });
    } catch (err) {
      console.warn("Could not fetch order book:", err.message);
    } finally {
      setIsLoading(false);
    }
  }, [getClient, zone.currency, zone.counterparty, accountInfo?.address]);

  useEffect(() => {
    if (clientConnected) {
      fetchOrderBook();
    }
  }, [clientConnected, fetchOrderBook]);

  useEffect(() => {
    if (clientConnected) {
      fetchOrderBook();
    }
  }, [userOffers, clientConnected, fetchOrderBook]);

  const userAddress = accountInfo?.address;
  const { sells: sellOrders, buys: buyOrders } = allOrders;
  const totalOrders = sellOrders.length + buyOrders.length;

  // Find the max amount for depth bar scaling
  const allAmounts = [...sellOrders, ...buyOrders].map((o) => o.xrpAmount);
  const maxAmount = Math.max(...allAmounts, 1);

  const spread =
    sellOrders.length > 0 && buyOrders.length > 0
      ? (parseFloat(sellOrders[0].price) - parseFloat(buyOrders[0].price)).toFixed(4)
      : null;

  const midPrice =
    sellOrders.length > 0 && buyOrders.length > 0
      ? ((parseFloat(sellOrders[0].price) + parseFloat(buyOrders[0].price)) / 2).toFixed(4)
      : sellOrders.length > 0
      ? sellOrders[0].price
      : buyOrders.length > 0
      ? buyOrders[0].price
      : null;

  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Order Book</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {zone.currency}/XRP
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={fetchOrderBook}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {totalOrders === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No orders in this zone yet.
          </p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            {/* Column headers */}
            <div className="grid grid-cols-4 gap-0 text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-secondary/60 px-3 py-2">
              <span>Price (XRP)</span>
              <span className="text-right">{zone.currency}</span>
              <span className="text-right">XRP</span>
              <span className="text-right">Account</span>
            </div>

            {/* Sell side (asks) — shown in reverse so lowest ask is near the middle */}
            <div className="divide-y divide-border/30">
              {[...sellOrders].reverse().map((order, i) => {
                const depthPct = (order.xrpAmount / maxAmount) * 100;
                return (
                  <div
                    key={`sell-${order.seq}-${i}`}
                    className="relative grid grid-cols-4 gap-0 items-center text-[13px] px-3 py-1.5"
                  >
                    {/* Depth bar */}
                    <div
                      className="absolute inset-y-0 right-0 bg-red-500/8"
                      style={{ width: `${depthPct}%` }}
                    />
                    <span className="relative font-mono text-red-500 font-medium">{order.price}</span>
                    <span className="relative text-right font-mono">{order.stablecoinAmount.toLocaleString()}</span>
                    <span className="relative text-right font-mono text-muted-foreground">{order.xrpAmount.toLocaleString()}</span>
                    <span className="relative text-right font-mono text-[11px] text-muted-foreground">
                      {order.account === userAddress ? (
                        <span className="text-primary font-medium">you</span>
                      ) : (
                        `${order.account.slice(0, 4)}...`
                      )}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Mid price / spread */}
            <div className="flex items-center justify-center gap-3 py-2.5 px-3 bg-secondary/40 border-y border-border/50">
              {midPrice && (
                <span className="text-base font-semibold font-mono">{midPrice}</span>
              )}
              {spread && (
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Spread {spread}
                </span>
              )}
              {!midPrice && (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>

            {/* Buy side (bids) */}
            <div className="divide-y divide-border/30">
              {buyOrders.map((order, i) => {
                const depthPct = (order.xrpAmount / maxAmount) * 100;
                return (
                  <div
                    key={`buy-${order.seq}-${i}`}
                    className="relative grid grid-cols-4 gap-0 items-center text-[13px] px-3 py-1.5"
                  >
                    {/* Depth bar */}
                    <div
                      className="absolute inset-y-0 right-0 bg-emerald-500/8"
                      style={{ width: `${depthPct}%` }}
                    />
                    <span className="relative font-mono text-emerald-600 font-medium">{order.price}</span>
                    <span className="relative text-right font-mono">{order.stablecoinAmount.toLocaleString()}</span>
                    <span className="relative text-right font-mono text-muted-foreground">{order.xrpAmount.toLocaleString()}</span>
                    <span className="relative text-right font-mono text-[11px] text-muted-foreground">
                      {order.account === userAddress ? (
                        <span className="text-primary font-medium">you</span>
                      ) : (
                        `${order.account.slice(0, 4)}...`
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
