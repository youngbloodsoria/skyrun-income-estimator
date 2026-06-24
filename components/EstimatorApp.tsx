"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, BarChart3, Download, Printer, Save, Sparkles } from "lucide-react";
import { calculateEstimate, currency, defaultEstimateInput, EstimateInput, MARKETS } from "@/lib/estimator";
import { createClient } from "@/lib/supabase/client";
import type { Profile, SavedEstimate } from "@/lib/types";

type Props = {
  profile: Profile;
  savedEstimates: SavedEstimate[];
  staffMode?: boolean;
  demoMode?: boolean;
};

export function EstimatorApp({ profile, savedEstimates, staffMode = false, demoMode = false }: Props) {
  const router = useRouter();
  const [input, setInput] = useState<EstimateInput>({
    ...defaultEstimateInput,
    ownerName: staffMode ? "" : profile.full_name || "",
    ownerEmail: staffMode ? "" : profile.email,
    phone: staffMode ? "" : profile.phone || ""
  });
  const [resultVisible, setResultVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const result = useMemo(() => calculateEstimate(input), [input]);

  function update<K extends keyof EstimateInput>(key: K, value: EstimateInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
    setSaveStatus("");
  }

  async function generateEstimate(event: React.FormEvent) {
    event.preventDefault();
    setResultVisible(true);
    setSaving(true);
    setSaveStatus("");

    if (demoMode) {
      setTimeout(() => {
        setSaving(false);
        setSaveStatus("Preview generated. Connect Supabase to save estimates.");
      }, 350);
      return;
    }

    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Your session expired. Please sign in again.");

      const row = {
        owner_name: input.ownerName,
        owner_email: input.ownerEmail,
        phone: input.phone,
        property_address: input.propertyAddress,
        market: input.market,
        bedrooms: input.bedrooms,
        property_style: input.propertyStyle,
        base_rate: input.baseRate,
        occupancy_pct: result.occupancyPct,
        management_fee_pct: input.managementFeePct,
        pets_allowed: input.petsAllowed,
        notes: input.notes,
        annual_gross: result.annualGross,
        net_to_owner: result.netToOwner,
        average_nightly_rate: result.averageNightlyRate,
        nights_booked: result.nightsBooked,
        created_by: userData.user.id,
        input_snapshot: input,
        result_snapshot: result
      };

      const { data, error } = await supabase.from("estimator_estimates").insert(row).select("id").single();
      if (error) throw error;

      await fetch("/api/notify-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estimateId: data.id })
      });

      setSaveStatus("Estimate saved securely.");
      router.refresh();
    } catch (error) {
      setSaveStatus(error instanceof Error ? error.message : "The estimate was generated but could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  function downloadCsv() {
    const rows = [
      ["Month", "Available nights", "Seasonality", "Occupied nights", "Nightly rate", "Revenue"],
      ...result.monthly.map((month) => [
        month.month,
        month.nights,
        month.multiplier.toFixed(2),
        month.occupiedNights,
        month.rate.toFixed(2),
        month.revenue.toFixed(2)
      ])
    ];
    const blob = new Blob([rows.map((row) => row.join(",")).join("\n")], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "skyrun-income-estimate.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className="estimator-layout">
      <section className="panel panel-pad estimator-form-panel">
        <div className="panel-title">
          <div>
            <div className="eyebrow">Property profile</div>
            <h2 style={{ marginTop: 10 }}>Build your projection</h2>
          </div>
          <Sparkles color="#f8b91c" />
        </div>
        <form onSubmit={generateEstimate}>
          <div className="form-grid">
            <div className="field span-2">
              <label>Owner name</label>
              <input className="input" value={input.ownerName} onChange={(event) => update("ownerName", event.target.value)} required />
            </div>
            <div className="field span-2">
              <label>Owner email</label>
              <input
                className="input"
                type="email"
                value={input.ownerEmail}
                onChange={(event) => update("ownerEmail", event.target.value)}
                readOnly={!staffMode}
                required
              />
            </div>
            <div className="field span-2">
              <label>Phone number</label>
              <input className="input" type="tel" value={input.phone} onChange={(event) => update("phone", event.target.value)} required />
            </div>
            <div className="field span-2">
              <label>Property address</label>
              <input className="input" value={input.propertyAddress} onChange={(event) => update("propertyAddress", event.target.value)} placeholder="329 S Hwy 143, Brian Head, UT" required />
            </div>
            <div className="field">
              <label>Market</label>
              <select className="select" value={input.market} onChange={(event) => update("market", event.target.value as EstimateInput["market"])}>
                {Object.entries(MARKETS).map(([key, market]) => <option key={key} value={key}>{market.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Bedrooms</label>
              <select className="select" value={input.bedrooms} onChange={(event) => update("bedrooms", event.target.value as EstimateInput["bedrooms"])}>
                {["Studio", "1BR", "2BR", "3BR", "4+BR"].map((bedroom) => <option key={bedroom}>{bedroom}</option>)}
              </select>
            </div>
            <div className="field span-2">
              <label>Property style</label>
              <select className="select" value={input.propertyStyle} onChange={(event) => update("propertyStyle", event.target.value as EstimateInput["propertyStyle"])}>
                {["Condo / Standard", "Cabin / Chalet", "Luxury"].map((style) => <option key={style}>{style}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Base nightly rate</label>
              <input className="input" type="number" min={30} value={input.baseRate} onChange={(event) => update("baseRate", Number(event.target.value))} required />
            </div>
            <div className="field">
              <label>Expected occupancy</label>
              <input className="input" type="number" min={10} max={95} value={input.occupancyPct} onChange={(event) => update("occupancyPct", Number(event.target.value))} required />
            </div>
            <div className="field">
              <label>Management fee</label>
              <input className="input" type="number" step=".1" min={0} max={60} value={input.managementFeePct} onChange={(event) => update("managementFeePct", Number(event.target.value))} required />
            </div>
            <label className="checkbox-row">
              <input type="checkbox" checked={input.petsAllowed} onChange={(event) => update("petsAllowed", event.target.checked)} />
              Pet-friendly
            </label>
            <div className="field span-2">
              <label>Property highlights</label>
              <textarea className="textarea" value={input.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Ski-in/ski-out, private hot tub, garage, recent renovation…" />
            </div>
          </div>
          <button className="button button-primary button-wide" disabled={saving}>
            {saving ? "Saving your estimate…" : resultVisible ? "Update and save estimate" : "Generate my estimate"}
            {saving ? <Save size={17} /> : <ArrowRight size={17} />}
          </button>
          {saveStatus && <div className={`form-status ${saveStatus.includes("saved securely") ? "success" : ""}`}>{saveStatus}</div>}
        </form>
      </section>

      <section className="results-stack">
        {!resultVisible ? (
          <div className="panel empty-state">
            <BarChart3 size={42} color="#0877bd" />
            <strong>Your projection will appear here</strong>
            <p>Complete the property profile and generate your private estimate.</p>
            {savedEstimates.length > 0 && <p className="form-help">You have {savedEstimates.length} saved estimate{savedEstimates.length === 1 ? "" : "s"}.</p>}
          </div>
        ) : (
          <>
            <div className="results-hero">
              <div className="results-label">Estimated annual gross revenue</div>
              <div className="results-amount">{currency.format(result.annualGross)}</div>
              <div className="results-meta">
                <span>{input.propertyAddress}</span>
                <span>{result.marketLabel}</span>
                <span>{input.bedrooms} · {input.propertyStyle}</span>
              </div>
            </div>

            <div className="metric-grid">
              <div className="metric"><span>Net to owner</span><strong>{currency.format(result.netToOwner)}</strong></div>
              <div className="metric"><span>Nights booked</span><strong>{result.nightsBooked}</strong></div>
              <div className="metric"><span>Average nightly</span><strong>{currency.format(result.averageNightlyRate)}</strong></div>
              <div className="metric"><span>Occupancy</span><strong>{Math.round(result.occupancyPct)}%</strong></div>
            </div>

            <div className="panel panel-pad">
              <div className="panel-title">
                <div>
                  <div className="eyebrow">12-month outlook</div>
                  <h3 style={{ marginTop: 9 }}>Seasonal revenue forecast</h3>
                </div>
                <button className="button button-secondary no-print" onClick={downloadCsv}><Download size={16} /> CSV</button>
              </div>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={result.monthly}>
                    <defs>
                      <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0877bd" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#0877bd" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5ecef" vertical={false} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${Math.round(value / 1000)}k`} width={45} />
                    <Tooltip formatter={(value) => currency.format(Number(value))} />
                    <Area type="monotone" dataKey="revenue" stroke="#0877bd" strokeWidth={3} fill="url(#revenueFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel panel-pad">
              <div className="panel-title">
                <div>
                  <div className="eyebrow">Market sensitivity</div>
                  <h3 style={{ marginTop: 9 }}>A practical range</h3>
                </div>
                <button className="button button-secondary no-print" onClick={() => window.print()}><Printer size={16} /> Print / PDF</button>
              </div>
              <div className="scenario-list">
                {result.scenarios.map((scenario) => (
                  <div className="scenario" key={scenario.label}>
                    <div><strong>{scenario.label}</strong><br /><small>{Math.round(scenario.occupancy * 100)}% occupancy · {currency.format(scenario.averageRate)} avg. nightly</small></div>
                    <strong>{currency.format(scenario.gross)}</strong>
                  </div>
                ))}
              </div>
              <p className="form-help" style={{ marginTop: 18 }}>
                Directional estimate only—not a guarantee of performance. Actual results vary with market conditions, property quality, owner use, pricing, and guest demand.
              </p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
