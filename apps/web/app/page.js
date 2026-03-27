"use client";

import { Header } from "../components/Header";
import { AccountInfo } from "../components/AccountInfo";
import { TransactionForm } from "../components/TransactionForm";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="container py-6">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">TerraSwap</h1>
            <p className="text-muted-foreground">
              Jurisdiction-aware credential-gated stablecoin DEX on XRPL
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <AccountInfo />
            <TransactionForm />
          </div>
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
