import { stringToHex } from "./utils";

// All addresses and domain IDs from scripts/accounts.json — public on-chain data
const STABLECOIN_ISSUER = "rDNKkhVt7xdq3UQu5C3xHTzjcQa7tUNq4U";
const KYC_ISSUER = "rJcbHWpz5GwwFrneadsg8Yf7FfnbHBgLnx";
const DOMAIN_OWNER = "rnNjzyyU18dHb8m16UjWnawAbUU33ERJiH";

// Counterparty accounts from scripts (alice has SwissKYC, bob has MiCAKYC)
const ALICE = "rD5BMy1wM8h5kEBeTp8oG3yvosscmG5qAF";
const BOB = "rLSwVUhBUXuq7Cktapb4z46MzP7oAkF5Bf";

export const TERRASWAP_CONFIG = {
  kycIssuer: KYC_ISSUER,
  domainOwner: DOMAIN_OWNER,
  stablecoinIssuer: STABLECOIN_ISSUER,

  zones: {
    swiss: {
      id: "swiss",
      name: "Swiss Zone",
      flag: "\ud83c\udde8\ud83c\udded",
      domainId: "CDE0D2D90EDE60D0903D424055C03EC39F6EA9582AF7E1FA255C688ADD1FAB9A",
      credentialType: "SwissKYC",
      credentialTypeHex: stringToHex("SwissKYC"),
      currency: "CHF",
      currencyName: "Swiss Franc",
      description: "Regulated Swiss stablecoin trading zone requiring SwissKYC credentials",
      counterparty: ALICE,
    },
    eu: {
      id: "eu",
      name: "EU Zone",
      flag: "\ud83c\uddea\ud83c\uddfa",
      domainId: "F29205DF25B6853B4CF01CBF7D666DC28A0C2D5E9ED0FCA393AC2A1DECBEC981",
      credentialType: "MiCAKYC",
      credentialTypeHex: stringToHex("MiCAKYC"),
      currency: "EUR",
      currencyName: "Euro",
      description: "MiCA-compliant EU stablecoin trading zone requiring MiCAKYC credentials",
      counterparty: BOB,
    },
  },
};

export const ZONE_IDS = Object.keys(TERRASWAP_CONFIG.zones);
