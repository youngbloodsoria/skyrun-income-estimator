import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Settings } from "lucide-react";
import { Footer, Header } from "@/components/SiteChrome";
import { EstimateDashboard } from "@/components/EstimateDashboard";
import { createClient } from "@/lib/supabase/server";
import type { Profile, SavedEstimate } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/estimate");
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/staff");

  const { data: profileData } = await supabase.from("estimator_profiles").select("*").eq("id", userData.user.id).single();
  const profile = profileData as Profile;
  if (!profile || !["employee", "admin"].includes(profile.role)) redirect("/staff?unauthorized=1");

  const { data } = await supabase.from("estimator_estimates").select("*").order("created_at", { ascending: false }).limit(100);
  const estimates = (data || []) as SavedEstimate[];

  return (
    <div className="site-shell">
      <Header signedIn staff />
      <main className="app-main">
        <div className="page-heading">
          <div>
            <div className="eyebrow">SkyRun team workspace</div>
            <h1>Owner opportunity dashboard</h1>
            <p>Review incoming estimates and prepare polished projections for owners.</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {profile.role === "admin" && <Link className="button button-secondary" href="/admin"><Settings size={17} /> Manage access</Link>}
            <Link className="button button-primary" href="/estimate"><Plus size={17} /> New estimate</Link>
          </div>
        </div>

        <EstimateDashboard initialEstimates={estimates} role={profile.role} />
      </main>
      <Footer />
    </div>
  );
}
