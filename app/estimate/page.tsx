import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText } from "lucide-react";
import { EstimatorApp } from "@/components/EstimatorApp";
import { Footer, Header } from "@/components/SiteChrome";
import { createClient } from "@/lib/supabase/server";
import type { Profile, SavedEstimate } from "@/lib/types";

export default async function EstimatePage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const supabase = await createClient();
  const demoMode = !supabase;

  let profile: Profile = {
    id: "demo",
    email: "preview@example.com",
    full_name: "Preview Owner",
    phone: "(435) 555-0123",
    role: "owner"
  };
  let savedEstimates: SavedEstimate[] = [];
  let editingEstimate: SavedEstimate | null = null;

  if (supabase) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) redirect("/");

    const [{ data: profileData }, { data: estimateData }, editResult] = await Promise.all([
      supabase.from("estimator_profiles").select("*").eq("id", userData.user.id).single(),
      supabase.from("estimator_estimates").select("*").order("created_at", { ascending: false }).limit(10),
      edit ? supabase.from("estimator_estimates").select("*").eq("id", edit).single() : Promise.resolve({ data: null })
    ]);

    profile = profileData as Profile;
    savedEstimates = (estimateData || []) as SavedEstimate[];
    editingEstimate = (editResult.data || null) as SavedEstimate | null;
    if (edit && !editingEstimate) redirect("/estimate");
  }

  const staffMode = profile.role === "employee" || profile.role === "admin";

  return (
    <div className="site-shell">
      <Header signedIn staff={staffMode} />
      <main className="app-main">
        <div className="page-heading">
          <div>
            <div className="eyebrow">{staffMode ? "Employee workspace" : "Private owner workspace"}</div>
            <h1>{editingEstimate ? "Update saved estimate" : staffMode ? "Prepare an owner estimate" : "Your income estimate"}</h1>
            <p>{editingEstimate ? "Adjust the original assumptions and save the refreshed projection." : "Refine the assumptions, generate the projection, and save it securely."}</p>
          </div>
        </div>
        {savedEstimates.length > 0 && !editingEstimate && (
          <section className="saved-estimate-strip no-print">
            <div>
              <FileText size={19} />
              <span><strong>Saved estimates</strong><small>Open, print, or update a prior projection.</small></span>
            </div>
            <div className="saved-estimate-links">
              {savedEstimates.slice(0, 5).map((estimate) => (
                <Link href={`/dashboard/estimates/${estimate.id}`} key={estimate.id}>
                  {estimate.property_address || estimate.owner_name}
                </Link>
              ))}
            </div>
          </section>
        )}
        <EstimatorApp
          profile={profile}
          savedEstimates={savedEstimates}
          staffMode={staffMode}
          demoMode={demoMode}
          initialEstimate={editingEstimate}
        />
      </main>
      <Footer />
    </div>
  );
}
