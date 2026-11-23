"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, Trash2, Users } from "lucide-react";
import { currency } from "@/lib/estimator";
import { createClient } from "@/lib/supabase/client";
import type { SavedEstimate, UserRole } from "@/lib/types";

export function EstimateDashboard({
  initialEstimates,
  role
}: {
  initialEstimates: SavedEstimate[];
  role: UserRole;
}) {
  const [estimates, setEstimates] = useState(initialEstimates);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [handlingId, setHandlingId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const waiting = estimates.filter(item => item.created_by_staff === false && !item.estimator_followups);
  const visible = estimates.filter(item => filter === "all" || (filter === "waiting" ? item.created_by_staff === false && !item.estimator_followups : Boolean(item.estimator_followups)));
  const totalPipeline = estimates.reduce((sum, estimate) => sum + Number(estimate.annual_gross), 0);
  const canDelete = role === "admin";

  async function toggleHandled(estimate: SavedEstimate) {
    setHandlingId(estimate.id);
    setStatus("");
    try {
      const supabase = createClient();
      if (estimate.estimator_followups) {
        const { error } = await supabase.from("estimator_followups").delete().eq("estimate_id", estimate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("estimator_followups").insert({ estimate_id: estimate.id });
        if (error && error.code !== "23505") throw error;
      }
      const { data, error } = await supabase.from("estimator_followups").select("handled_at").eq("estimate_id", estimate.id).maybeSingle();
      if (error) throw error;
      if (Boolean(data) === Boolean(estimate.estimator_followups)) throw new Error("Follow-up status did not change. Please refresh and try again.");
      setEstimates(current => current.map(item => item.id === estimate.id ? { ...item, estimator_followups: data } : item));
    } catch (error) {
      setStatus(error && typeof error === "object" && "message" in error ? String(error.message) : "Could not update follow-up status.");
    } finally { setHandlingId(null); }
  }

  async function deleteEstimate(estimate: SavedEstimate) {
    const confirmed = window.confirm(
      `Delete the estimate for ${estimate.owner_name} at ${estimate.property_address}?\n\nThis cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(estimate.id);
    setStatus("");
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("estimator_estimates")
        .delete()
        .eq("id", estimate.id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        throw new Error("Supabase did not delete this estimate. Run the latest admin migration, then sign out and back in.");
      }
      setEstimates((current) => current.filter((item) => item.id !== estimate.id));
      setStatus(`Deleted the estimate for ${estimate.owner_name}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The estimate could not be deleted.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <div className="metric-grid" style={{ marginBottom: 22 }}>
        <div className="metric"><span>Owner opportunities</span><strong>{estimates.length}</strong></div>
        <div className="metric"><span>Projected gross pipeline</span><strong>{currency.format(totalPipeline)}</strong></div>
        <div className="metric"><span>Average projection</span><strong>{currency.format(estimates.length ? totalPipeline / estimates.length : 0)}</strong></div>
        <div className="metric"><span>Team access</span><strong><Users size={25} /></strong></div>
      </div>

      <section className="panel panel-pad">
        <div className="panel-title">
          <h2>Recent estimates</h2>
          <span className="badge">{estimates.length} saved</span>
        </div>
        <p className="form-help">{waiting.length} owner submissions awaiting help in the latest {estimates.length} estimates. Handling an inquiry removes it from Mission’s open revenue total; you can reopen it anytime.</p>
        <label>Show estimates <select value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All recent estimates</option><option value="waiting">Owners awaiting help</option><option value="handled">Handled</option></select></label>
        {status && <div className={`form-status ${status.startsWith("Deleted") ? "success" : "error"}`}>{status}</div>}
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Owner</th>
                <th>Property</th>
                <th>Created</th>
                <th>Projection</th>
                <th>Contact</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {visible.map((estimate) => (
                <tr key={estimate.id}>
                  <td><strong>{estimate.owner_name}</strong><br /><span className="form-help">{estimate.owner_email || "Employee prepared"}</span></td>
                  <td>{estimate.property_address}<br /><span className="form-help">{estimate.bedrooms} · {estimate.market}</span></td>
                  <td>{new Date(estimate.created_at).toLocaleDateString()}</td>
                  <td><strong>{currency.format(estimate.annual_gross)}</strong></td>
                  <td><a href={`tel:${estimate.phone}`} style={{ color: "#0877bd", fontWeight: 800 }}>{estimate.phone}</a></td>
                  <td className="table-actions">
                    <span className="form-help">{estimate.created_by_staff === true ? "Employee prepared" : estimate.created_by_staff === false ? "Owner submitted" : "Source unknown"}</span>
                    <button type="button" className="button button-secondary" aria-pressed={Boolean(estimate.estimator_followups)} disabled={handlingId === estimate.id} onClick={() => void toggleHandled(estimate)}>
                      {handlingId === estimate.id ? "Saving…" : estimate.estimator_followups ? "Handled · Reopen" : "Mark handled"}
                    </button>
                    <Link
                      className="icon-view-button"
                      href={`/dashboard/estimates/${estimate.id}`}
                      aria-label={`View estimate for ${estimate.owner_name}`}
                      title="View saved estimate"
                    >
                      <Eye size={17} />
                    </Link>
                    {canDelete && (
                      <button
                        className="icon-danger-button"
                        type="button"
                        onClick={() => deleteEstimate(estimate)}
                        disabled={deletingId === estimate.id}
                        aria-label={`Delete estimate for ${estimate.owner_name}`}
                        title="Delete estimate"
                      >
                        <Trash2 size={17} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-state">
                    No estimates match this view. <Link href="/estimate" style={{ color: "#0877bd" }}>Create an estimate <ArrowRight size={14} /></Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {canDelete && <p className="form-help admin-delete-note">Only estimator admins can permanently delete saved estimates.</p>}
      </section>
    </>
  );
}
