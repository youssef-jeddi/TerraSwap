"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
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
      // Query account_offers from all known participants
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

      // Filter offers that involve this zone's currency
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
          // Maker is selling stablecoin (TakerGets = stablecoin)
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
          // Maker is buying stablecoin (TakerPays = stablecoin)
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

  // Refresh when user's offers change (placed/cancelled)
  useEffect(() => {
    if (clientConnected) {
      fetchOrderBook();
    }
  }, [userOffers, clientConnected, fetchOrderBook]);

  const userAddress = accountInfo?.address;
  const { sells: sellOrders, buys: buyOrders } = allOrders;
  const totalOrders = sellOrders.length + buyOrders.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">
              Order Book — {zone.currency}/XRP
            </CardTitle>
            <CardDescription>
              All open orders in the {zone.name}. {totalOrders} order{totalOrders !== 1 ? "s" : ""}.
            </CardDescription>
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
      <CardContent>
        {totalOrders === 0 ? (
          <p className="text-sm text-muted-foreground">
            No orders in this zone yet. Be the first to place one.
          </p>
        ) : (
          <div className="space-y-1">
            {/* Header */}
            <div className="grid grid-cols-5 gap-2 text-xs font-medium text-muted-foreground border-b pb-2">
              <span>Side</span>
              <span className="text-right">Price (XRP)</span>
              <span className="text-right">{zone.currency}</span>
              <span className="text-right">XRP</span>
              <span className="text-right">Account</span>
            </div>

            {/* Sell orders (red) */}
            {sellOrders.map((order, i) => (
              <div
                key={`sell-${order.seq}-${i}`}
                className="grid grid-cols-5 gap-2 items-center text-sm rounded-md px-2 py-1.5 bg-red-50 border border-red-100"
              >
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 w-fit">
                  SELL
                </Badge>
                <span className="text-right font-mono text-red-700">{order.price}</span>
                <span className="text-right font-mono">{order.stablecoinAmount.toLocaleString()}</span>
                <span className="text-right font-mono">{order.xrpAmount.toLocaleString()}</span>
                <span className="text-right font-mono text-xs text-muted-foreground">
                  {order.account === userAddress ? "(you)" : `${order.account.slice(0, 4)}...${order.account.slice(-4)}`}
                </span>
              </div>
            ))}

            {/* Spread */}
            {sellOrders.length > 0 && buyOrders.length > 0 && (
              <div className="text-center text-xs text-muted-foreground py-1 border-y">
                Spread:{" "}
                {(parseFloat(sellOrders[0]?.price || 0) - parseFloat(buyOrders[0]?.price || 0)).toFixed(4)} XRP
              </div>
            )}

            {/* Buy orders (green) */}
            {buyOrders.map((order, i) => (
              <div
                key={`buy-${order.seq}-${i}`}
                className="grid grid-cols-5 gap-2 items-center text-sm rounded-md px-2 py-1.5 bg-emerald-50 border border-emerald-100"
              >
                <Badge variant="success" className="text-[10px] px-1.5 py-0 w-fit">
                  BUY
                </Badge>
                <span className="text-right font-mono text-emerald-700">{order.price}</span>
                <span className="text-right font-mono">{order.stablecoinAmount.toLocaleString()}</span>
                <span className="text-right font-mono">{order.xrpAmount.toLocaleString()}</span>
                <span className="text-right font-mono text-xs text-muted-foreground">
                  {order.account === userAddress ? "(you)" : `${order.account.slice(0, 4)}...${order.account.slice(-4)}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
