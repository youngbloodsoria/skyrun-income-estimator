import { notFound, redirect } from "next/navigation";
import { Footer, Header } from "@/components/SiteChrome";
import { SavedEstimateReport } from "@/components/SavedEstimateReport";
import { createClient } from "@/lib/supabase/server";
import type { Profile, SavedEstimate } from "@/lib/types";

export default async function SavedEstimatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) redirect("/");

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/");

  const { data: profileData } = await supabase.from("estimator_profiles").select("*").eq("id", userData.user.id).single();
  const profile = profileData as Profile;
  if (!profile) redirect("/");
  const staffMode = ["employee", "admin"].includes(profile.role);

  const { data: estimate } = await supabase.from("estimator_estimates").select("*").eq("id", id).single();
  if (!estimate) notFound();

  return (
    <div className="site-shell">
      <Header signedIn staff={staffMode} />
      <main className="app-main saved-report-main">
        <SavedEstimateReport estimate={estimate as SavedEstimate} staffMode={staffMode} />
      </main>
      <Footer />
    </div>
  );
}
