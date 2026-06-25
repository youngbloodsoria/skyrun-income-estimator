"use client";

import { useState } from "react";
import { ArrowRight, LockKeyhole, MailCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function OwnerAccess() {
  const router = useRouter();
  const [step, setStep] = useState<"details" | "code">("details");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/estimate`,
          data: { full_name: fullName.trim(), phone: phone.trim(), role: "owner" }
        }
      });
      if (error) throw error;
      sessionStorage.setItem("skyrun_owner_details", JSON.stringify({ fullName, email, phone }));
      setStep("code");
      setStatus({ type: "success", text: `We sent a secure sign-in code to ${email}.` });
    } catch (error) {
      setStatus({ type: "error", text: friendlyAuthError(error, "We could not send the code. Please try again.") });
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code.replace(/\D/g, ""),
        type: "email"
      });
      if (error) throw error;
      if (!data.user) throw new Error("We could not verify this email.");

      const { error: profileError } = await supabase.from("estimator_profiles").update({
        full_name: fullName.trim(),
        phone: phone.trim()
      }).eq("id", data.user.id);
      if (profileError) throw profileError;

      router.push("/estimate");
      router.refresh();
    } catch (error) {
      setStatus({ type: "error", text: friendlyAuthError(error, "That code was not accepted. Please try again.") });
    } finally {
      setBusy(false);
    }
  }

  if (step === "code") {
    return (
      <form onSubmit={verifyCode}>
        <MailCheck size={34} color="#0877bd" />
        <h2 style={{ marginTop: 14 }}>Check your email</h2>
        <p>Enter the verification code we sent you. This keeps your property estimate private.</p>
        <div className="field">
          <label htmlFor="code">Verification code</label>
          <input
            id="code"
            className="input code-input"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="000000"
            required
          />
        </div>
        {status && <div className={`form-status ${status.type}`}>{status.text}</div>}
        <button className="button button-primary button-wide" disabled={busy || ![6, 8].includes(code.replace(/\D/g, "").length)}>
          {busy ? "Verifying…" : "Verify and continue"} <ArrowRight size={17} />
        </button>
        <button type="button" className="button button-ghost button-wide" onClick={() => setStep("details")}>
          Use a different email
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={sendCode}>
      <LockKeyhole size={34} color="#0877bd" />
      <h2 style={{ marginTop: 14 }}>Unlock your estimate</h2>
      <p>Tell us where to send your private results. No password required.</p>
      <div className="field">
        <label htmlFor="fullName">Your name</label>
        <input id="fullName" className="input" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Jordan Smith" required />
      </div>
      <div className="field">
        <label htmlFor="email">Email address</label>
        <input id="email" className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
      </div>
      <div className="field">
        <label htmlFor="phone">Phone number</label>
        <input id="phone" className="input" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(435) 555-0123" required />
      </div>
      {status && <div className={`form-status ${status.type}`}>{status.text}</div>}
      <button className="button button-primary button-wide" disabled={busy}>
        {busy ? "Sending secure code…" : "Get my estimate"} <ArrowRight size={17} />
      </button>
      <p className="form-help" style={{ marginBottom: 0, marginTop: 13 }}>
        By continuing, you agree that SkyRun Brian Head may contact you about your property. Your information is never sold.
      </p>
    </form>
  );
}

function friendlyAuthError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : "";
  if (/rate.*exceed|too many requests/i.test(message)) {
    return "Too many verification emails were requested. Please wait before requesting another code, then try again.";
  }
  return message || fallback;
}
