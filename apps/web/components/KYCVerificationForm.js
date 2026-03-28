"use client";

import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Alert, AlertDescription } from "./ui/alert";
import { useAdminTransactions } from "../hooks/useAdminTransactions";
import { Upload, AlertCircle, CheckCircle2, X } from "lucide-react";

const ALL_COUNTRIES = [
  { value: "CH", label: "Switzerland" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "IT", label: "Italy" },
  { value: "ES", label: "Spain" },
  { value: "NL", label: "Netherlands" },
  { value: "BE", label: "Belgium" },
  { value: "AT", label: "Austria" },
  { value: "IE", label: "Ireland" },
  { value: "PT", label: "Portugal" },
  { value: "FI", label: "Finland" },
  { value: "GR", label: "Greece" },
  { value: "LU", label: "Luxembourg" },
];

const SWISS_VALID = ["CH"];
const EU_VALID = ["DE", "FR", "IT", "ES", "NL", "BE", "AT", "IE", "PT", "FI", "GR", "LU"];

const selectClasses =
  "flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50";

function validateForm(formData, zone) {
  if (!formData.fullName.trim()) return "Full name is required.";
  if (!formData.dateOfBirth) return "Date of birth is required.";

  const dob = new Date(formData.dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  if (age < 18) return "Verification rejected: You must be at least 18 years old.";

  if (!formData.country) return "Country of residence is required.";

  const validCountries = zone.id === "swiss" ? SWISS_VALID : EU_VALID;
  if (!validCountries.includes(formData.country)) {
    const zoneName = zone.id === "swiss" ? "Switzerland" : "an EU member state";
    return `Verification rejected: You must be a resident of ${zoneName} to qualify for ${zone.credentialType}.`;
  }

  if (!formData.idType) return "ID document type is required.";
  if (!formData.documentName) return "Please upload an identity document.";
  if (!formData.termsAccepted) return "You must accept the terms and conditions.";

  return null;
}

export function KYCVerificationForm({ zone, walletAddress, onSuccess, onCancel }) {
  const { issueCredential } = useAdminTransactions();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    fullName: "",
    dateOfBirth: "",
    country: "",
    idType: "",
    documentName: "",
    termsAccepted: false,
  });
  const [validationError, setValidationError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  const update = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setValidationError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError(null);
    setSubmitResult(null);

    const error = validateForm(formData, zone);
    if (error) {
      setValidationError(error);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await issueCredential(walletAddress, zone.credentialType);
      if (result.success) {
        setSubmitResult({ success: true });
        setTimeout(() => onSuccess(), 1500);
      } else {
        setSubmitResult({ success: false, error: result.error });
      }
    } catch (err) {
      setSubmitResult({ success: false, error: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">KYC Verification</h4>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`name-${zone.id}`}>Full Name</Label>
        <Input
          id={`name-${zone.id}`}
          placeholder="Enter your full name"
          value={formData.fullName}
          onChange={(e) => update("fullName", e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`dob-${zone.id}`}>Date of Birth</Label>
        <Input
          id={`dob-${zone.id}`}
          type="date"
          value={formData.dateOfBirth}
          onChange={(e) => update("dateOfBirth", e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`country-${zone.id}`}>Country of Residence</Label>
        <select
          id={`country-${zone.id}`}
          className={selectClasses}
          value={formData.country}
          onChange={(e) => update("country", e.target.value)}
        >
          <option value="">Select country...</option>
          {ALL_COUNTRIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`idtype-${zone.id}`}>ID Document Type</Label>
        <select
          id={`idtype-${zone.id}`}
          className={selectClasses}
          value={formData.idType}
          onChange={(e) => update("idType", e.target.value)}
        >
          <option value="">Select document type...</option>
          <option value="passport">Passport</option>
          <option value="national_id">National ID</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <Label>Identity Document</Label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            Upload
          </Button>
          <span className="text-sm text-muted-foreground truncate">
            {formData.documentName || "No file selected"}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => update("documentName", e.target.files?.[0]?.name || "")}
          />
        </div>
      </div>

      <div className="flex items-start gap-2">
        <Checkbox
          checked={formData.termsAccepted}
          onCheckedChange={(checked) => update("termsAccepted", checked)}
        />
        <span
          className="text-sm text-muted-foreground leading-tight cursor-pointer"
          onClick={() => update("termsAccepted", !formData.termsAccepted)}
        >
          I confirm that the information provided is accurate and I agree to the KYC verification
          terms.
        </span>
      </div>

      {validationError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}

      {submitResult?.success && (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Verification approved. Your {zone.credentialType} credential is now pending acceptance.
          </AlertDescription>
        </Alert>
      )}

      {submitResult && !submitResult.success && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{submitResult.error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting || submitResult?.success}>
        {isSubmitting ? "Verifying..." : "Submit Verification"}
      </Button>
    </form>
  );
}
