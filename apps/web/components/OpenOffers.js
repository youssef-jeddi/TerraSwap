"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { useTerraSwapTransactions } from "../hooks/useTerraSwapTransactions";

function formatAmount(amount) {
  if (typeof amount === "string") {
    // XRP in drops
    return `${(parseInt(amount) / 1_000_000).toLocaleString()} XRP`;
  }
  if (typeof amount === "object" && amount.value) {
    return `${parseFloat(amount.value).toLocaleString()} ${amount.currency}`;
  }
  return "Unknown";
}

export function OpenOffers({ zone, offers }) {
  const { cancelOffer } = useTerraSwapTransactions();
  const [cancellingSeq, setCancellingSeq] = useState(null);

  const handleCancel = async (seq) => {
    try {
      setCancellingSeq(seq);
      await cancelOffer(seq);
    } catch (err) {
      console.error("Failed to cancel offer:", err);
    } finally {
      setCancellingSeq(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Open Offers</CardTitle>
        <CardDescription>
          Your active orders in the {zone.name}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {offers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open offers in this zone.</p>
        ) : (
          <div className="space-y-2">
            {offers.map((offer) => (
              <div
                key={offer.seq}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="text-sm">
                  <span className="font-medium">Sell</span>{" "}
                  {formatAmount(offer.taker_gets)}{" "}
                  <span className="text-muted-foreground">for</span>{" "}
                  <span className="font-medium">{formatAmount(offer.taker_pays)}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCancel(offer.seq)}
                  disabled={cancellingSeq === offer.seq}
                >
                  {cancellingSeq === offer.seq ? "Cancelling..." : "Cancel"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
