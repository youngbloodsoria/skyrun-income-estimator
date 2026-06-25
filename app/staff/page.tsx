"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MailCheck, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Footer } from "@/components/SiteChrome";

export default function StaffLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      const normalized = email.trim().toLowerCase();
      if (!normalized.endsWith("@skyrun.com")) {
        throw new Error("Please use your SkyRun work email.");
      }

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: normalized,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
          data: { role: "employee" }
        }
      });
      if (error) throw error;
      setStep("code");
      setStatus(`A secure sign-in code was sent to ${normalized}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to send a sign-in code.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code.replace(/\D/g, ""),
        type: "email"
      });
      if (error) throw error;
      if (!data.user) throw new Error("The code could not be verified.");

      const { data: profile } = await supabase.from("estimator_profiles").select("role").eq("id", data.user.id).single();
      if (!profile || !["employee", "admin"].includes(profile.role)) {
        await supabase.auth.signOut();
        throw new Error("This account does not have employee access.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "That code was not accepted.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="site-shell">
      <main className="hero" style={{ gridTemplateColumns: "1fr", minHeight: "calc(100vh - 88px)" }}>
        <div className="access-card" style={{ width: "min(480px, 100%)", margin: "0 auto", textAlign: "center" }}>
          <Image src="/skyrun-logo.png" alt="SkyRun Brian Head" width={92} height={92} />
          <div className="eyebrow" style={{ marginTop: 12 }}>Team access</div>
          <h2 style={{ fontSize: 32, marginTop: 16 }}>{step === "email" ? "Employee sign in" : "Check your email"}</h2>

          {step === "email" ? (
            <form onSubmit={sendCode}>
              <p>Use an approved SkyRun email. No separate password or Google administrator is required.</p>
              <div className="field" style={{ textAlign: "left" }}>
                <label htmlFor="staffEmail">SkyRun email</label>
                <input
                  id="staffEmail"
                  className="input"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@skyrun.com"
                  required
                />
              </div>
              {status && <div className="form-status">{status}</div>}
              <button className="button button-primary button-wide" disabled={busy}>
                <MailCheck size={18} /> {busy ? "Sending code…" : "Send secure code"}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyCode}>
              <p>Enter the six-digit code sent to your SkyRun inbox.</p>
              <div className="field">
                <label htmlFor="staffCode">Verification code</label>
                <input
                  id="staffCode"
                  className="input code-input"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="000000"
                  required
                />
              </div>
              {status && <div className="form-status">{status}</div>}
              <button className="button button-primary button-wide" disabled={busy || code.replace(/\D/g, "").length !== 6}>
                {busy ? "Verifying…" : "Open employee dashboard"} <ArrowRight size={17} />
              </button>
              <button type="button" className="button button-ghost button-wide" onClick={() => setStep("email")}>
                Use a different email
              </button>
            </form>
          )}

          <div className="form-help" style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 18 }}>
            <ShieldCheck size={15} /> Access is limited to approved employee accounts.
          </div>
          <div className="divider">or</div>
          <Link className="button button-ghost button-wide" href="/">Return to owner estimator</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
