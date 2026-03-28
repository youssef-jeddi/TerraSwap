"use client";

import "./globals.css";
import { WalletProvider } from "../components/providers/WalletProvider";
import { XrplClientProvider } from "../components/providers/XrplClientProvider";
import { TerraSwapProvider } from "../components/providers/TerraSwapProvider";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>TerraSwap</title>
      </head>
      <body className="bg-gray-50">
        <WalletProvider>
          <XrplClientProvider>
            <TerraSwapProvider>{children}</TerraSwapProvider>
          </XrplClientProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
