"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardFooter } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { CheckCircle2, Clock, Lock, ArrowRight } from "lucide-react";
import { useTerraSwapTransactions } from "../hooks/useTerraSwapTransactions";

export function ZoneCard({ zone, hasAccess, pendingCredential }) {
  const { acceptCredential } = useTerraSwapTransactions();
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState(null);

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

  const isLocked = !hasAccess && !pendingCredential;
  const isPending = !hasAccess && !!pendingCredential;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{zone.flag}</span>
            <div>
              <h3 className="text-base font-semibold">{zone.name}</h3>
              <p className="text-sm text-muted-foreground">{zone.currencyName}</p>
            </div>
          </div>
          {hasAccess && (
            <Badge variant="success">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          )}
          {isPending && (
            <Badge variant="warning">
              <Clock className="h-3 w-3 mr-1" />
              Pending
            </Badge>
          )}
          {isLocked && (
            <Badge variant="secondary">
              <Lock className="h-3 w-3 mr-1" />
              Locked
            </Badge>
          )}
        </div>

        <div className="space-y-2.5 pt-3 border-t border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Currency</span>
            <span className="font-medium">{zone.currency}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Credential</span>
            <span className="font-medium">{zone.credentialType}</span>
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive mt-3">{error}</p>
        )}
      </CardContent>

      <CardFooter>
        {hasAccess && (
          <Link href={`/zone/${zone.id}`} className="w-full">
            <Button className="w-full">
              Enter Zone
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        )}
        {isPending && (
          <Button
            className="w-full"
            variant="outline"
            onClick={handleAcceptCredential}
            disabled={isAccepting}
          >
            {isAccepting ? "Signing..." : "Accept Credential"}
          </Button>
        )}
        {isLocked && (
          <Link href="/credentials" className="w-full">
            <Button variant="outline" className="w-full">
              Request Verification
            </Button>
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}
