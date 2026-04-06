const EU_COUNTRIES = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE",
];

// Edel-ID returns verifiedClaims as [{given_name: "Jane"}, {family_name: "Doe"}]
// This flattens it to {given_name: "Jane", family_name: "Doe"}
export function flattenVerifiedClaims(claimsArray) {
  return Object.assign({}, ...claimsArray);
}

export function determineCredentialType(claims) {
  if (!claims.age_over_18) {
    return { approved: false, reason: "Verification rejected: you must be at least 18 years old." };
  }

  // Use issuing_country or nationality if available, default to CH (Swiyu is a Swiss wallet)
  const country = (claims.issuing_country || claims.nationality || "CH").toUpperCase();

  if (country === "CH") {
    return { approved: true, credentialType: "SwissKYC", zone: "swiss" };
  }

  if (EU_COUNTRIES.includes(country)) {
    return { approved: true, credentialType: "MiCAKYC", zone: "eu" };
  }

  return {
    approved: false,
    reason: `Verification rejected: residents of ${country} are not eligible. Only Swiss and EU residents qualify.`,
  };
}
