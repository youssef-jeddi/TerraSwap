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
        <meta name="description" content="Institutional stablecoin DEX on XRPL" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <WalletProvider>
          <XrplClientProvider>
            <TerraSwapProvider>{children}</TerraSwapProvider>
          </XrplClientProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
