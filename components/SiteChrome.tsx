"use client";

import Image from "next/image";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function Header({ signedIn = false, staff = false }: { signedIn?: boolean; staff?: boolean }) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="site-header">
      <Link className="brand-lockup" href="/">
        <Image src="/skyrun-logo.png" alt="SkyRun Brian Head" width={58} height={58} priority />
        <div>
          SkyRun Income Estimator
          <small>Serving Brian Head</small>
        </div>
      </Link>
      <div className="header-actions">
        {signedIn ? (
          <>
            <Link className="button button-ghost" href={staff ? "/dashboard" : "/estimate"}>
              {staff ? "Dashboard" : "My estimate"}
            </Link>
            <button className="button button-secondary" onClick={signOut}>
              <LogOut size={16} /> Sign out
            </button>
          </>
        ) : (
          <Link className="button button-secondary" href="/staff">
            Employee sign in
          </Link>
        )}
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <span>Built in California, Powered by</span>
      <Image src="/nudge-logo.png" alt="Nudge Advisors" width={105} height={28} />
    </footer>
  );
}
