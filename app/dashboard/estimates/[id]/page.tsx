import { notFound, redirect } from "next/navigation";
import { Footer, Header } from "@/components/SiteChrome";
import { SavedEstimateReport } from "@/components/SavedEstimateReport";
import { createClient } from "@/lib/supabase/server";
import type { Profile, SavedEstimate } from "@/lib/types";

export default async function SavedEstimatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) redirect("/staff");

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/staff");

  const { data: profileData } = await supabase.from("estimator_profiles").select("*").eq("id", userData.user.id).single();
  const profile = profileData as Profile;
  if (!profile || !["employee", "admin"].includes(profile.role)) redirect("/staff?unauthorized=1");

  const { data: estimate } = await supabase.from("estimator_estimates").select("*").eq("id", id).single();
  if (!estimate) notFound();

  return (
    <div className="site-shell">
      <Header signedIn staff />
      <main className="app-main saved-report-main">
        <SavedEstimateReport estimate={estimate as SavedEstimate} />
      </main>
      <Footer />
    </div>
  );
}
