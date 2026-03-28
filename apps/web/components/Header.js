"use client";

import Link from "next/link";
import { WalletConnector } from "./WalletConnector";
import { useWalletManager } from "../hooks/useWalletManager";
import { useWallet } from "./providers/WalletProvider";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

export function Header() {
  useWalletManager();
  const { statusMessage } = useWallet();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-foreground text-background">
            <span className="font-semibold text-sm">TS</span>
          </div>
          <span className="font-semibold">TerraSwap</span>
        </div>

        <div className="flex flex-1 items-center justify-end gap-3">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
              Admin
            </Button>
          </Link>
          <Badge variant="outline" className="text-xs">
            Devnet
          </Badge>
          {statusMessage && (
            <Badge
              variant={
                statusMessage.type === "success"
                  ? "success"
                  : statusMessage.type === "error"
                  ? "destructive"
                  : statusMessage.type === "warning"
                  ? "warning"
                  : "secondary"
              }
            >
              {statusMessage.message}
            </Badge>
          )}
          <WalletConnector />
        </div>
      </div>
    </header>
  );
}
