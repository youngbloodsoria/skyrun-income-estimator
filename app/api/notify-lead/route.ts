import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({ estimateId: z.string().uuid() });

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { data: estimate, error } = await supabase.from("estimator_estimates").select("*").eq("id", parsed.data.estimateId).single();
  if (error || !estimate) return NextResponse.json({ error: "Estimate not found" }, { status: 404 });

  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return NextResponse.json({ ok: true, email: "skipped" });

  const to = process.env.LEAD_NOTIFICATION_TO || "brianhead@skyrun.com";
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || "estimates@skyrunbrianhead.com";
  const fromName = process.env.SENDGRID_FROM_NAME || "SkyRun Brian Head";

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: fromEmail, name: fromName },
      subject: `New property estimate: ${estimate.owner_name}`,
      content: [{
        type: "text/html",
        value: `
          <h2>New SkyRun income estimate</h2>
          <p><strong>Owner:</strong> ${escapeHtml(estimate.owner_name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(estimate.owner_email || "Prepared by employee")}</p>
          <p><strong>Phone:</strong> ${escapeHtml(estimate.phone)}</p>
          <p><strong>Property:</strong> ${escapeHtml(estimate.property_address)}</p>
          <p><strong>Estimated annual gross:</strong> ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(estimate.annual_gross)}</p>
          <p>Sign in to the employee dashboard to review the complete estimate.</p>
        `
      }]
    })
  });

  if (!response.ok) return NextResponse.json({ error: "Notification failed" }, { status: 502 });
  return NextResponse.json({ ok: true });
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
