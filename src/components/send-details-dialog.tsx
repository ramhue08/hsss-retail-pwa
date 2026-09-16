"use client";

import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { CONSENT_COPY } from "@/lib/site";
import type { SendContactDetails } from "@/lib/contact";

type Props = {
  open: boolean;
  initial: SendContactDetails;
  loading: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (details: SendContactDetails) => void;
};

export function SendDetailsDialog({
  open,
  initial,
  loading,
  error,
  onCancel,
  onConfirm,
}: Props) {
  const titleId = useId();
  const [firstName, setFirstName] = useState(initial.first_name);
  const [email, setEmail] = useState(initial.email);
  const [phone, setPhone] = useState(initial.phone);
  const [postcode, setPostcode] = useState(initial.postcode);
  const [consent, setConsent] = useState(initial.marketing_consent);

  useEffect(() => {
    if (!open) return;
    setFirstName(initial.first_name);
    setEmail(initial.email);
    setPhone(initial.phone);
    setPostcode(initial.postcode);
    setConsent(initial.marketing_consent);
  }, [
    open,
    initial.first_name,
    initial.email,
    initial.phone,
    initial.postcode,
    initial.marketing_consent,
  ]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onConfirm({
      first_name: firstName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      postcode: postcode.trim(),
      marketing_consent: consent,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-navy-deep/50"
        aria-label="Cancel"
        disabled={loading}
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-[var(--shadow-elevated)] sm:max-w-md sm:rounded-2xl sm:p-6"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-navy">
              Your contact details
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              We need these to send your design to Hydro Seal Shower Systems and
              quote freight to your postcode.
            </p>
          </div>
          <Input
            label="First name"
            autoComplete="given-name"
            required
            autoFocus
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            hint="Australian mobile or landline, so we can reach you about your design."
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Input
            label="Postcode"
            inputMode="numeric"
            autoComplete="postal-code"
            required
            maxLength={4}
            pattern="\d{4}"
            hint="Four-digit Australian postcode."
            value={postcode}
            onChange={(e) =>
              setPostcode(e.target.value.replace(/\D/g, "").slice(0, 4))
            }
          />
          <label className="flex items-start gap-3 text-sm text-slate-600">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan focus:ring-cyan"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>{CONSENT_COPY}</span>
          </label>
          {error && <Notice variant="error">{error}</Notice>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              disabled={loading}
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Sending…" : "Confirm"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
