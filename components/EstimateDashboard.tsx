"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Trash2, Users } from "lucide-react";
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
  const totalPipeline = estimates.reduce((sum, estimate) => sum + Number(estimate.annual_gross), 0);
  const canDelete = role === "admin";

  async function deleteEstimate(estimate: SavedEstimate) {
    const confirmed = window.confirm(
      `Delete the estimate for ${estimate.owner_name} at ${estimate.property_address}?\n\nThis cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(estimate.id);
    setStatus("");
    try {
      const supabase = createClient();
      const { error } = await supabase.from("estimator_estimates").delete().eq("id", estimate.id);
      if (error) throw error;
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
                {canDelete && <th aria-label="Actions" />}
              </tr>
            </thead>
            <tbody>
              {estimates.map((estimate) => (
                <tr key={estimate.id}>
                  <td><strong>{estimate.owner_name}</strong><br /><span className="form-help">{estimate.owner_email || "Employee prepared"}</span></td>
                  <td>{estimate.property_address}<br /><span className="form-help">{estimate.bedrooms} · {estimate.market}</span></td>
                  <td>{new Date(estimate.created_at).toLocaleDateString()}</td>
                  <td><strong>{currency.format(estimate.annual_gross)}</strong></td>
                  <td><a href={`tel:${estimate.phone}`} style={{ color: "#0877bd", fontWeight: 800 }}>{estimate.phone}</a></td>
                  {canDelete && (
                    <td className="table-action">
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
                    </td>
                  )}
                </tr>
              ))}
              {estimates.length === 0 && (
                <tr>
                  <td colSpan={canDelete ? 6 : 5} className="empty-state">
                    No estimates yet. <Link href="/estimate" style={{ color: "#0877bd" }}>Create the first one <ArrowRight size={14} /></Link>
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
