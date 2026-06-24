import { redirect } from "next/navigation";
import { EstimatorApp } from "@/components/EstimatorApp";
import { Footer, Header } from "@/components/SiteChrome";
import { createClient } from "@/lib/supabase/server";
import type { Profile, SavedEstimate } from "@/lib/types";

export default async function EstimatePage() {
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

  if (supabase) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) redirect("/");

    const [{ data: profileData }, { data: estimateData }] = await Promise.all([
      supabase.from("estimator_profiles").select("*").eq("id", userData.user.id).single(),
      supabase.from("estimator_estimates").select("*").order("created_at", { ascending: false }).limit(10)
    ]);

    profile = profileData as Profile;
    savedEstimates = (estimateData || []) as SavedEstimate[];
  }

  const staffMode = profile.role === "employee" || profile.role === "admin";

  return (
    <div className="site-shell">
      <Header signedIn staff={staffMode} />
      <main className="app-main">
        <div className="page-heading">
          <div>
            <div className="eyebrow">{staffMode ? "Employee workspace" : "Private owner workspace"}</div>
            <h1>{staffMode ? "Prepare an owner estimate" : "Your income estimate"}</h1>
            <p>Refine the assumptions, generate the projection, and save it securely.</p>
          </div>
        </div>
        <EstimatorApp profile={profile} savedEstimates={savedEstimates} staffMode={staffMode} demoMode={demoMode} />
      </main>
      <Footer />
    </div>
  );
}
