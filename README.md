# TerraSwap

Jurisdiction-aware credential-gated stablecoin DEX built on the XRP Ledger. Users verify their identity through an EUDI-compatible wallet (Swiyu), receive on-ledger Verifiable Credentials, and gain access to regulated trading zones where they can swap stablecoins on XRPL's native order book — all within permissioned domains.

Built for the [XRPL Student Builder Residency](https://xrpl.org/).

## How It Works

```
User connects wallet
        |
        v
Scans QR code with Swiyu / EUDI wallet
        |
        v
Edel-ID verifies identity (OpenID4VP)
        |
        v
Jurisdiction rules applied (CH → SwissKYC, EU → MiCAKYC)
        |
        v
Verifiable Credential issued on XRPL
        |
        v
User accepts credential → enters permissioned trading zone
        |
        v
Trade stablecoins (CHF/XRP, EUR/XRP) on the DEX
```

## XRPL Features Used

| Feature | Usage |
|---|---|
| **Permissioned Domains** | Gated trading zones — only wallets with the right credential can trade within each domain |
| **Verifiable Credentials** | On-ledger KYC attestation (`CredentialCreate` / `CredentialAccept`) linking identity to wallets |
| **Trust Lines & IOUs** | `TrustSet` enables holding issued stablecoins (CHF, EUR) from a regulated issuer |
| **Order Book (DEX)** | Native `OfferCreate` / `OfferCancel` for stablecoin/XRP trading within each zone |

## Trading Zones

| Zone | Credential | Currency | Regulation |
|---|---|---|---|
| Swiss Zone | SwissKYC | CHF (Swiss Franc) | Swiss financial regulation |
| EU Zone | MiCAKYC | EUR (Euro) | MiCA-compliant |

Jurisdiction is determined automatically from the identity wallet's `issuing_country` claim:
- **CH** → SwissKYC credential → Swiss Zone access
- **EU member state** → MiCAKYC credential → EU Zone access

## Architecture

```
apps/web/                    Next.js 14 (App Router)
├── app/
│   ├── page.js              Dashboard — zone cards, balances, credential status
│   ├── credentials/         Credential wallet — verify identity, accept credentials
│   ├── zone/[id]/           Trading zone — order book, trade form, open offers
│   ├── admin/               Admin panel — issue/revoke credentials, send stablecoins
│   └── api/
│       ├── kyc/             Edel-ID integration (OpenID4VP verification + XRPL credential issuance)
│       └── admin/           Admin XRPL transactions (server-side signing)
├── components/
│   ├── EUDIVerificationModal.js   QR code + deep link verification flow
│   ├── TradeForm.js               DEX trading interface
│   ├── OrderBook.js               Live order book display
│   ├── OpenOffers.js              User's active offers
│   └── providers/                 WalletProvider → XrplClientProvider → TerraSwapProvider
├── lib/
│   ├── terraswap-config.js        Zone definitions, addresses, domain IDs
│   ├── jurisdictionRules.js       Country → credential type mapping
│   └── xrpl-server.js            Shared XRPL utilities (RPC, transaction submission)
└── hooks/
    └── useTerraSwapTransactions.js  Client-side XRPL transaction hooks

scripts/                     Ledger setup (run once on Devnet)
├── 01-setup-accounts.js     Fund accounts via faucet
├── 02-issue-stablecoins.js  Create CHF/EUR IOUs + trust lines
├── 03-create-credentials.js Issue initial credentials
├── 04-create-domains.js     Create permissioned domains
└── 05-test-permissioned-dex.js  Verify gated trading works
```

## Tech Stack

- **Next.js 14** (App Router) — frontend + API routes
- **xrpl.js** — XRPL client SDK for transactions and queries
- **xrpl-connect** — Xaman (XUMM) wallet integration
- **Edel-ID** — EUDI wallet verifier (OpenID4VP / Swiyu)
- **Tailwind CSS** — styling
- **Turborepo** — monorepo build system

## Quick Start

### Prerequisites

- Node.js >= 18
- pnpm >= 8

### Install & Run

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

Copy `.env.example` to `.env.local` in `apps/web/`:

```bash
cp apps/web/.env.example apps/web/.env.local
```

| Variable | Description |
|---|---|
| `EDEL_ID_API_KEY` | Edel-ID verifier API key |
| `EDEL_ID_API_SECRET` | Edel-ID verifier API secret |
| `EDEL_ID_VERIFIER_URL` | Verifier endpoint (default: `https://verifier.edel-id.ch`) |
| `MOCK_KYC` | Set to `true` to skip real wallet verification (for development) |

### Ledger Setup (Devnet)

Run the setup scripts in order to provision accounts, stablecoins, credentials, and permissioned domains on XRPL Devnet:

```bash
cd scripts
node 01-setup-accounts.js
node 02-issue-stablecoins.js
node 03-create-credentials.js
node 04-create-domains.js
```

## Identity Verification Flow

1. User clicks **"Verify with EUDI Wallet"** on the Credentials page
2. App creates a verification session via Edel-ID API (`POST /api/verification/ch` or `/eu`)
3. QR code is displayed — user scans it with the Swiyu app (or EUDI Reference Wallet)
4. Wallet presents requested claims (age, name, issuing country) via OpenID4VP
5. Server receives verified claims via blocking endpoint, applies jurisdiction rules
6. If approved, a `CredentialCreate` transaction is submitted to XRPL
7. User accepts the credential (`CredentialAccept`) to unlock the corresponding trading zone

## Deployment

Deployed on **Vercel**. Key notes:

- Set all `EDEL_ID_*` environment variables in Vercel project settings
- Set `MOCK_KYC=true` if the blocking verification endpoint exceeds Vercel's function timeout (10s on free tier)
- Register your Vercel domain in the Xaman Developer Console for wallet connections

## License

See [LICENSE](./LICENSE).
