"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { CheckCircle2, AlertCircle, Loader2, X, Smartphone, Shield, Award } from "lucide-react";
import { cn } from "../lib/utils";

const STEPS = [
  { label: "Scan QR", icon: Smartphone },
  { label: "Approve in Wallet", icon: Shield },
  { label: "Credential Issued", icon: Award },
];

function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const isActive = i === currentStep;
        const isComplete = i < currentStep;
        return (
          <div key={step.label} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={cn(
                  "w-8 h-px",
                  isComplete ? "bg-primary" : "bg-border"
                )}
              />
            )}
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                  isActive && "bg-primary text-primary-foreground",
                  isComplete && "bg-primary text-primary-foreground",
                  !isActive && !isComplete && "bg-secondary text-muted-foreground"
                )}
              >
                {isComplete ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span
                className={cn(
                  "text-xs whitespace-nowrap",
                  isActive || isComplete ? "text-foreground font-medium" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function EUDIVerificationModal({ open, zone, walletAddress, onSuccess, onClose }) {
  const [step, setStep] = useState("idle"); // idle | loading | scanning | processing | complete | error
  const [sessionId, setSessionId] = useState(null);
  const [verificationUrl, setVerificationUrl] = useState(null);
  const [verificationUri, setVerificationUri] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const reset = useCallback(() => {
    setStep("idle");
    setSessionId(null);
    setVerificationUrl(null);
    setVerificationUri(null);
    setResult(null);
    setError(null);
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  // Reset when modal opens/closes
  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const startVerification = async () => {
    setStep("loading");
    setError(null);

    try {
      const res = await fetch("/api/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "startVerification", zone }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to start verification");
      }

      setSessionId(data.sessionId);
      setVerificationUrl(data.verificationUrl);
      setVerificationUri(data.verificationUri);
      setStep("scanning");

      // Immediately fire the blocking completeVerification call
      awaitCompletion(data.sessionId);
    } catch (err) {
      setError(err.message);
      setStep("error");
    }
  };

  const awaitCompletion = async (sid) => {
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "completeVerification",
          sessionId: sid,
          walletAddress,
          zone,
        }),
        signal: controller.signal,
      });
      const data = await res.json();

      if (controller.signal.aborted) return;

      if (data.approved) {
        setResult(data);
        setStep("complete");
        // Auto-trigger onSuccess after brief delay
        setTimeout(() => onSuccess?.(), 1500);
      } else {
        setError(data.reason || data.error || "Verification was not approved.");
        setResult(data);
        setStep("error");
      }
    } catch (err) {
      if (err.name === "AbortError") return;
      setError(err.message);
      setStep("error");
    }
  };

  const handleClose = () => {
    if (step === "processing") return; // Don't close during XRPL tx
    reset();
    onClose?.();
  };

  if (!open) return null;

  const isMockUrl = verificationUrl?.startsWith("mock://");

  const currentStepIndex =
    step === "scanning" ? 0 :
    step === "processing" ? 1 :
    step === "complete" ? 2 : -1;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={step !== "processing" ? handleClose : undefined}
      />

      {/* Modal */}
      <div className="relative bg-card rounded-lg border shadow-lg w-full max-w-md mx-4 p-6">
        {/* Close button */}
        {step !== "processing" && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Title */}
        <div className="text-center mb-4">
          <h2 className="text-lg font-semibold">EUDI Wallet Verification</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Verify your identity to access trading zones
          </p>
        </div>

        {/* Step indicator (visible during scanning/processing/complete) */}
        {currentStepIndex >= 0 && <StepIndicator currentStep={currentStepIndex} />}

        {/* Idle state */}
        {step === "idle" && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Scan a QR code with your EUDI wallet to verify your identity.
                Your verified credentials will determine which trading zone you can access.
              </p>
            </div>
            <Button onClick={startVerification} className="w-full">
              Start Verification
            </Button>
          </div>
        )}

        {/* Loading state */}
        {step === "loading" && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground mt-3">Creating verification request...</p>
          </div>
        )}

        {/* Scanning state — QR code displayed */}
        {step === "scanning" && (
          <div className="text-center space-y-4">
            <div className="bg-white rounded-lg p-4 inline-block mx-auto">
              {isMockUrl ? (
                <div className="w-48 h-48 border-2 border-dashed border-primary/30 rounded-lg flex flex-col items-center justify-center gap-2">
                  <Shield className="h-8 w-8 text-primary/40" />
                  <span className="text-xs font-medium text-primary/60">MOCK MODE</span>
                  <span className="text-xs text-muted-foreground">Auto-completes in ~5s</span>
                </div>
              ) : (
                <QRCodeSVG
                  value={verificationUrl}
                  size={192}
                  level="M"
                  includeMargin={false}
                />
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              Scan this QR code with your EUDI wallet
            </p>

            {!isMockUrl && verificationUri && (
              <a
                href={verificationUri}
                className="text-xs text-primary hover:underline inline-block"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in EUDI Wallet
              </a>
            )}

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Waiting for wallet response...
            </div>
          </div>
        )}

        {/* Processing state */}
        {step === "processing" && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground mt-3">
              Issuing credential on XRPL...
            </p>
          </div>
        )}

        {/* Complete state */}
        {step === "complete" && result && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Identity Verified</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {result.verifiedName} — {result.verifiedCountry}
              </p>
            </div>
            <Alert variant="success">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Your <span className="font-semibold">{result.credentialType}</span> credential
                has been issued. Accept it in your wallet to activate zone access.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Error state */}
        {step === "error" && (
          <div className="space-y-4">
            {result?.verifiedName && (
              <div className="text-center text-sm text-muted-foreground">
                Verified as: {result.verifiedName}
                {result.verifiedCountry && ` (${result.verifiedCountry})`}
              </div>
            )}
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={() => { reset(); startVerification(); }}>
                Try Again
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (typeof window === "undefined") return null;
  return createPortal(modalContent, document.body);
}
