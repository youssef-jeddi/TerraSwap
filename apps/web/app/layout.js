"use client";

import "./globals.css";
import { WalletProvider } from "../components/providers/WalletProvider";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>TerraSwap</title>
      </head>
      <body className="bg-gray-50">
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
