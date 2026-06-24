import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Plus, Settings, Users } from "lucide-react";
import { Footer, Header } from "@/components/SiteChrome";
import { createClient } from "@/lib/supabase/server";
import { currency } from "@/lib/estimator";
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
  const totalPipeline = estimates.reduce((sum, estimate) => sum + Number(estimate.annual_gross), 0);

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

        <div className="metric-grid" style={{ marginBottom: 22 }}>
          <div className="metric"><span>Owner opportunities</span><strong>{estimates.length}</strong></div>
          <div className="metric"><span>Projected gross pipeline</span><strong>{currency.format(totalPipeline)}</strong></div>
          <div className="metric"><span>Average projection</span><strong>{currency.format(estimates.length ? totalPipeline / estimates.length : 0)}</strong></div>
          <div className="metric"><span>Team access</span><strong><Users size={25} /></strong></div>
        </div>

        <section className="panel panel-pad">
          <div className="panel-title"><h2>Recent estimates</h2><span className="badge">{estimates.length} saved</span></div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Owner</th><th>Property</th><th>Created</th><th>Projection</th><th>Contact</th></tr></thead>
              <tbody>
                {estimates.map((estimate) => (
                  <tr key={estimate.id}>
                    <td><strong>{estimate.owner_name}</strong><br /><span className="form-help">{estimate.owner_email || "Employee prepared"}</span></td>
                    <td>{estimate.property_address}<br /><span className="form-help">{estimate.bedrooms} · {estimate.market}</span></td>
                    <td>{new Date(estimate.created_at).toLocaleDateString()}</td>
                    <td><strong>{currency.format(estimate.annual_gross)}</strong></td>
                    <td><a href={`tel:${estimate.phone}`} style={{ color: "#0877bd", fontWeight: 800 }}>{estimate.phone}</a></td>
                  </tr>
                ))}
                {estimates.length === 0 && <tr><td colSpan={5} className="empty-state">No estimates yet. <Link href="/estimate" style={{ color: "#0877bd" }}>Create the first one <ArrowRight size={14} /></Link></td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
