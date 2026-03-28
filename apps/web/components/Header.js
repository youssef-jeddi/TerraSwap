"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletConnector } from "./WalletConnector";
import { useWalletManager } from "../hooks/useWalletManager";
import { useWallet } from "./providers/WalletProvider";
import { Badge } from "./ui/badge";

const NAV_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/credentials", label: "Credentials" },
  { href: "/admin", label: "Admin" },
];

export function Header() {
  useWalletManager();
  const { statusMessage } = useWallet();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-white">
      <div className="container flex h-16 items-center">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-semibold tracking-tight text-foreground">
              TerraSwap
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-150 ${
                    isActive
                      ? "text-foreground bg-secondary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-1 items-center justify-end gap-3">
          <span className="text-[11px] text-muted-foreground border border-border rounded-full px-2.5 py-0.5">
            Devnet
          </span>
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
