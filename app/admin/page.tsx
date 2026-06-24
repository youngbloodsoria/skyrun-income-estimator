import { redirect } from "next/navigation";
import { AdminEmployees } from "@/components/AdminEmployees";
import { Footer, Header } from "@/components/SiteChrome";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export default async function AdminPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/estimate");
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/staff");
  const { data: profileData } = await supabase.from("estimator_profiles").select("*").eq("id", userData.user.id).single();
  const profile = profileData as Profile;
  if (!profile || profile.role !== "admin") redirect("/dashboard");

  const { data: employees } = await supabase.from("estimator_employee_access").select("*").order("created_at", { ascending: false });

  return (
    <div className="site-shell">
      <Header signedIn staff />
      <main className="app-main">
        <div className="page-heading">
          <div>
            <div className="eyebrow">Administration</div>
            <h1>Team access</h1>
            <p>Control who can use the estimator on behalf of property owners.</p>
          </div>
        </div>
        <AdminEmployees initialEmployees={(employees || []) as never[]} />
      </main>
      <Footer />
    </div>
  );
}
