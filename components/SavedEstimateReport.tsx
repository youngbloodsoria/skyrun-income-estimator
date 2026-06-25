"use client";

import { ArrowLeft, CalendarDays, Check, Mail, Pencil, Phone, Printer } from "lucide-react";
import Link from "next/link";
import { currency, MONTHS } from "@/lib/estimator";
import type { SavedEstimate } from "@/lib/types";

type MonthlyRow = {
  month: string;
  demandBand?: string;
  ownerNights?: number;
  occupiedNights: number;
  rate: number;
  revenue: number;
};

export function SavedEstimateReport({ estimate, staffMode }: { estimate: SavedEstimate; staffMode: boolean }) {
  const input = estimate.input_snapshot || {};
  const result = estimate.result_snapshot || {};
  const monthly = Array.isArray(result.monthly) ? result.monthly as MonthlyRow[] : [];
  const insights = Array.isArray(result.insights) ? result.insights as string[] : [];
  const strengths = Array.isArray(input.strengths) ? input.strengths as string[] : [];
  const annualGross = numberValue(result.annualGross, estimate.annual_gross);
  const netToOwner = numberValue(result.netToOwner, estimate.net_to_owner);
  const nightsBooked = numberValue(result.nightsBooked, estimate.nights_booked);
  const averageNightlyRate = numberValue(result.averageNightlyRate, estimate.average_nightly_rate);
  const occupancyPct = numberValue(result.occupancyPct, estimate.occupancy_pct);
  const ownerUseNights = numberValue(input.ownerUseNights, 0);
  const ownerUseImpact = numberValue(result.ownerUseImpact, 0);
  const marketLabel = stringValue(result.marketLabel, humanizeMarket(estimate.market));
  const created = new Date(estimate.created_at);

  return (
    <div className="saved-report">
      <div className="saved-report-actions no-print">
        <Link className="button button-secondary" href={staffMode ? "/dashboard" : "/estimate"}><ArrowLeft size={16} /> {staffMode ? "Back to dashboard" : "Back to estimates"}</Link>
        <div className="saved-report-action-group">
          <Link className="button button-secondary" href={`/estimate?edit=${estimate.id}`}><Pencil size={16} /> Edit estimate</Link>
          <button className="button button-primary" onClick={() => window.print()}><Printer size={16} /> Print / PDF</button>
        </div>
      </div>

      <header className="saved-report-header">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/skyrun-logo.png" alt="SkyRun Brian Head" />
        <div>
          <span>Saved income estimate</span>
          <h1>{estimate.owner_name}</h1>
          <p>{estimate.property_address}</p>
        </div>
        <div className="saved-report-date">
          <small>Created</small>
          <strong>{created.toLocaleDateString()}</strong>
          <span>{created.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
        </div>
      </header>

      <section className="saved-contact-bar">
        <span><Mail size={15} /> {estimate.owner_email || "No owner email saved"}</span>
        <span><Phone size={15} /> {estimate.phone}</span>
        <span><CalendarDays size={15} /> Current saved version</span>
      </section>

      <section className="saved-results-hero">
        <div>
          <span>Estimated annual gross revenue</span>
          <strong>{currency.format(annualGross)}</strong>
          <p>{marketLabel} · {estimate.bedrooms} · {estimate.property_style}</p>
        </div>
        <div className="saved-kpis">
          <div><span>Net to owner</span><strong>{currency.format(netToOwner)}</strong></div>
          <div><span>Guest nights</span><strong>{Math.round(nightsBooked)}</strong></div>
          <div><span>Average nightly</span><strong>{currency.format(averageNightlyRate)}</strong></div>
          <div><span>Occupancy</span><strong>{Math.round(occupancyPct)}%</strong></div>
        </div>
      </section>

      <div className="saved-report-grid">
        <section className="panel panel-pad">
          <div className="eyebrow">Saved assumptions</div>
          <h2 className="saved-section-title">Current property inputs</h2>
          <dl className="saved-assumptions">
            <div><dt>Market</dt><dd>{marketLabel}</dd></div>
            <div><dt>Bedrooms</dt><dd>{estimate.bedrooms}</dd></div>
            <div><dt>Property style</dt><dd>{estimate.property_style}</dd></div>
            <div><dt>Base nightly rate</dt><dd>{currency.format(estimate.base_rate)}</dd></div>
            <div><dt>Expected occupancy</dt><dd>{Math.round(numberValue(input.occupancyPct, estimate.occupancy_pct))}%</dd></div>
            <div><dt>Management fee</dt><dd>{Number(estimate.management_fee_pct).toFixed(1)}%</dd></div>
            <div><dt>Pet-friendly</dt><dd>{estimate.pets_allowed ? "Yes" : "No"}</dd></div>
            <div><dt>Owner-use nights</dt><dd>{ownerUseNights || "None"}</dd></div>
          </dl>
          {ownerUseNights > 0 && <p className="saved-owner-impact">Owner use reduced projected gross by approximately <strong>{currency.format(ownerUseImpact)}</strong>.</p>}
        </section>

        <section className="panel panel-pad">
          <div className="eyebrow">Property positioning</div>
          <h2 className="saved-section-title">Features and notes</h2>
          {strengths.length > 0 ? (
            <div className="strength-summary">
              {strengths.map((strength) => <span key={strength}><Check size={14} /> {strength}</span>)}
            </div>
          ) : <p className="form-help">No structured property strengths were selected.</p>}
          <div className="saved-notes">
            <strong>Additional notes</strong>
            <p>{estimate.notes || "No additional notes were included."}</p>
          </div>
        </section>
      </div>

      {insights.length > 0 && (
        <section className="panel panel-pad">
          <div className="eyebrow">Saved analysis</div>
          <h2 className="saved-section-title">Performance takeaways</h2>
          <div className="insight-grid">
            {insights.map((insight, index) => <div className="insight-card" key={insight}><span>{index + 1}</span><p>{insight}</p></div>)}
          </div>
        </section>
      )}

      <section className="panel panel-pad">
        <div className="eyebrow">Monthly forecast</div>
        <h2 className="saved-section-title">Current revenue schedule</h2>
        {monthly.length > 0 ? (
          <div className="table-wrap">
            <table className="table saved-monthly-table">
              <thead><tr><th>Month</th><th>Demand</th><th>Owner nights</th><th>Guest nights</th><th>Rate</th><th>Revenue</th></tr></thead>
              <tbody>
                {monthly.map((row, index) => (
                  <tr key={row.month || MONTHS[index]}>
                    <td><strong>{row.month || MONTHS[index]}</strong></td>
                    <td>{row.demandBand || "—"}</td>
                    <td>{row.ownerNights || 0}</td>
                    <td>{row.occupiedNights}</td>
                    <td>{currency.format(row.rate)}</td>
                    <td><strong>{currency.format(row.revenue)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="form-help">This early estimate was saved before monthly snapshots were added. Its headline assumptions and totals remain available above.</p>
        )}
      </section>

      <footer className="saved-report-footer">
        <span>SkyRun Brian Head · 435.990.4004 · brianhead@skyrun.com</span>
        <span>Saved estimate created on {created.toLocaleDateString()}{estimate.updated_at && estimate.updated_at !== estimate.created_at ? ` · last updated ${new Date(estimate.updated_at).toLocaleDateString()}` : ""}.</span>
      </footer>
    </div>
  );
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : Number(fallback || 0);
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value ? value : fallback;
}

function humanizeMarket(value: string) {
  if (value === "brianhead") return "Brian Head";
  if (value === "duckcreek") return "Duck Creek";
  if (value === "panguitch") return "Panguitch / Panguitch Lake";
  return value;
}
