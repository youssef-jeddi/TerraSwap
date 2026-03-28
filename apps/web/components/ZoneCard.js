"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Lock, CheckCircle2, Clock, ArrowRight } from "lucide-react";
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
    <Card
      className={
        hasAccess
          ? "border-emerald-200 bg-emerald-50/50"
          : isPending
          ? "border-amber-200 bg-amber-50/50"
          : "opacity-75"
      }
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="text-2xl">{zone.flag}</span>
            {zone.name}
          </CardTitle>
          {hasAccess && (
            <Badge variant="success">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Access Granted
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
        <CardDescription>{zone.description}</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Currency</span>
            <span className="font-medium">{zone.currency} ({zone.currencyName})</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Required Credential</span>
            <span className="font-mono text-xs">{zone.credentialType}</span>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
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
          <p className="text-sm text-muted-foreground text-center w-full">
            A <span className="font-medium">{zone.credentialType}</span> credential must be issued to your account by a KYC provider.
          </p>
        )}
      </CardFooter>
    </Card>
  );
}
