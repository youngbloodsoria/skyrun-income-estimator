"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  Clock3,
  Compass,
  Download,
  Home,
  Info,
  Printer,
  Save,
  ShieldCheck,
  Sparkles,
  TrendingUp
} from "lucide-react";
import {
  calculateEstimate,
  currency,
  defaultEstimateInput,
  EstimateInput,
  MARKETS,
  PROPERTY_STRENGTHS
} from "@/lib/estimator";
import { getPricingGuidance } from "@/lib/pricing-guidance";
import { createClient } from "@/lib/supabase/client";
import type { Profile, SavedEstimate } from "@/lib/types";

type Props = {
  profile: Profile;
  savedEstimates: SavedEstimate[];
  staffMode?: boolean;
  demoMode?: boolean;
  initialEstimate?: SavedEstimate | null;
};

const SKYRUN_VALUE = [
  "Dynamic pricing shaped around local demand",
  "Professional listing presentation and distribution",
  "Local guest support and property care",
  "Consistent cleaning and inspection standards",
  "Damage protection and liability safeguards",
  "A full-time Brian Head operations team"
];

export function EstimatorApp({ profile, savedEstimates, staffMode = false, demoMode = false, initialEstimate = null }: Props) {
  const router = useRouter();
  const [input, setInput] = useState<EstimateInput>(() => initialEstimate
    ? normalizeSavedInput(initialEstimate)
    : {
        ...defaultEstimateInput,
        ownerName: staffMode ? "" : profile.full_name || "",
        ownerEmail: staffMode ? "" : profile.email,
        phone: staffMode ? "" : profile.phone || ""
      });
  const [resultVisible, setResultVisible] = useState(Boolean(initialEstimate));
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const result = useMemo(() => calculateEstimate(input), [input]);

  function update<K extends keyof EstimateInput>(key: K, value: EstimateInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
    setSaveStatus("");
  }

  function toggleStrength(strength: string) {
    update(
      "strengths",
      input.strengths.includes(strength)
        ? input.strengths.filter((item) => item !== strength)
        : [...input.strengths, strength]
    );
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
        input_snapshot: input,
        result_snapshot: result
      };

      let savedEstimateId = initialEstimate?.id;

      if (initialEstimate) {
        const { data, error, count } = await supabase
          .from("estimator_estimates")
          .update({ ...row, updated_at: new Date().toISOString() }, { count: "exact" })
          .eq("id", initialEstimate.id)
          .select("id")
          .maybeSingle();
        if (error) throw error;
        if (!data || count === 0) {
          throw new Error("No saved estimate was updated. Please run the Supabase estimate-editing migration, then try again.");
        }
        savedEstimateId = data.id;
      } else {
        const { data, error } = await supabase
          .from("estimator_estimates")
          .insert({ ...row, created_by: userData.user.id })
          .select("id")
          .single();
        if (error) throw error;
        savedEstimateId = data.id;
      }

      if (!initialEstimate) {
        await fetch("/api/notify-lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ estimateId: savedEstimateId })
        });
      }

      setSaveStatus(initialEstimate ? "Estimate updated securely." : "Estimate saved securely.");
      router.refresh();
    } catch (error) {
      setSaveStatus(getErrorMessage(error, "The estimate was generated but could not be saved."));
    } finally {
      setSaving(false);
    }
  }

  function downloadCsv() {
    const rows = [
      ["Month", "Available nights", "Seasonality", "Demand band", "Owner nights", "Guest nights", "Nightly rate", "Revenue"],
      ...result.monthly.map((month) => [
        month.month,
        month.nights,
        month.multiplier.toFixed(2),
        month.demandBand,
        month.ownerNights,
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
          <div className="form-section-label">Owner and property</div>
          <div className="form-grid">
            <div className="field span-2">
              <label>Owner name</label>
              <input className="input" value={input.ownerName} onChange={(event) => update("ownerName", event.target.value)} required />
            </div>
            <div className="field span-2">
              <label>Owner email</label>
              <input className="input" type="email" value={input.ownerEmail} onChange={(event) => update("ownerEmail", event.target.value)} readOnly={!staffMode} required />
            </div>
            <div className="field span-2">
              <label>Phone number</label>
              <input className="input" type="tel" value={input.phone} onChange={(event) => update("phone", event.target.value)} required />
            </div>
            <div className="field span-2">
              <label>Property address</label>
              <input className="input" value={input.propertyAddress} onChange={(event) => update("propertyAddress", event.target.value)} placeholder="329 S Hwy 143, Brian Head, UT" required />
            </div>
          </div>

          <div className="form-section-label">Rental assumptions</div>
          <div className="form-grid">
            <div className="field">
              <label>Market</label>
              <select className="select" value={input.market} onChange={(event) => update("market", event.target.value as EstimateInput["market"])}>
                {Object.entries(MARKETS).map(([key, market]) => <option key={key} value={key}>{market.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Bedrooms</label>
              <select
                className="select"
                value={input.bedrooms}
                onChange={(event) => {
                  const bedrooms = event.target.value as EstimateInput["bedrooms"];
                  setInput((current) => ({ ...current, bedrooms, baseRate: getPricingGuidance(bedrooms).recommended }));
                  setSaveStatus("");
                }}
              >
                {["Studio", "1BR", "2BR", "3BR", "4+BR"].map((bedroom) => <option key={bedroom}>{bedroom}</option>)}
              </select>
            </div>
            <div className="market-form-note span-2">
              <Compass size={17} />
              <span>{MARKETS[input.market].demandPattern}</span>
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
              <span className="field-guidance">
                Portfolio guide: {currency.format(getPricingGuidance(input.bedrooms).low)}–{currency.format(getPricingGuidance(input.bedrooms).high)};
                suggested starting point {currency.format(getPricingGuidance(input.bedrooms).recommended)}.
              </span>
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
          </div>

          <div className="form-section-label">Your personal use</div>
          <div className="form-grid">
            <div className="field">
              <label>Owner nights per year</label>
              <input className="input" type="number" min={0} max={120} value={input.ownerUseNights} onChange={(event) => update("ownerUseNights", Number(event.target.value))} />
            </div>
            <div className="field">
              <label>When would you visit?</label>
              <select className="select" value={input.ownerUseTiming} onChange={(event) => update("ownerUseTiming", event.target.value as EstimateInput["ownerUseTiming"])}>
                <option value="peak">Mostly peak season</option>
                <option value="mixed">Spread through the year</option>
                <option value="value">Mostly value season</option>
              </select>
            </div>
          </div>

          <div className="form-section-label">Property strengths</div>
          <p className="form-help strength-help">These help the SkyRun team understand the home. They do not automatically inflate the projection.</p>
          <div className="strength-picker">
            {PROPERTY_STRENGTHS.map((strength) => (
              <button
                type="button"
                key={strength}
                className={`strength-chip ${input.strengths.includes(strength) ? "selected" : ""}`}
                onClick={() => toggleStrength(strength)}
              >
                {input.strengths.includes(strength) && <Check size={13} />}
                {strength}
              </button>
            ))}
          </div>
          <div className="field">
            <label>Other property highlights</label>
            <textarea className="textarea" value={input.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Recent renovation, game room, private deck, trailer parking…" />
          </div>

          <button className="button button-primary button-wide" disabled={saving}>
            {saving ? "Saving your estimate…" : initialEstimate ? "Save changes to estimate" : resultVisible ? "Update and save estimate" : "Generate my estimate"}
            {saving ? <Save size={17} /> : <ArrowRight size={17} />}
          </button>
          {saveStatus && <div className={`form-status ${/saved securely|updated securely/.test(saveStatus) ? "success" : ""}`}>{saveStatus}</div>}
        </form>
      </section>

      <section className="results-stack">
        {!resultVisible ? (
          <div className="panel empty-state">
            <BarChart3 size={42} color="#0877bd" />
            <strong>Your projection will appear here</strong>
            <p>Complete the property profile and generate your private estimate.</p>
            <div className="empty-preview">
              <span><TrendingUp size={17} /> Revenue range</span>
              <span><CalendarDays size={17} /> Seasonal demand</span>
              <span><Clock3 size={17} /> Booking behavior</span>
            </div>
            {savedEstimates.length > 0 && <p className="form-help">You have {savedEstimates.length} saved estimate{savedEstimates.length === 1 ? "" : "s"}.</p>}
          </div>
        ) : (
          <>
            <div className="print-report-header">
              {/* A direct image URL is used so print engines load the logo even while this header is hidden on screen. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/skyrun-logo.png" alt="SkyRun Brian Head" width="74" height="74" />
              <div>
                <span>SkyRun Brian Head</span>
                <strong>Vacation Rental Income Projection</strong>
                <small>
                  Prepared for {input.ownerName || "Property Owner"} · {new Date().toLocaleDateString()}
                </small>
                <small className="print-contact">435.990.4004 · brianhead@skyrun.com</small>
              </div>
            </div>
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
              <div className="metric"><span>Guest nights</span><strong>{result.nightsBooked}</strong></div>
              <div className="metric"><span>Average nightly</span><strong>{currency.format(result.averageNightlyRate)}</strong></div>
              <div className="metric"><span>Guest occupancy</span><strong>{Math.round(result.occupancyPct)}%</strong></div>
            </div>

            <div className="insight-grid">
              {result.insights.map((insight, index) => (
                <div className="insight-card" key={insight}>
                  <span>{index + 1}</span>
                  <p>{insight}</p>
                </div>
              ))}
            </div>

            <div className="panel panel-pad">
              <div className="panel-title">
                <div>
                  <div className="eyebrow">Demand calendar</div>
                  <h3 style={{ marginTop: 9 }}>When this market earns</h3>
                </div>
                <CalendarDays color="#0877bd" />
              </div>
              <div className="demand-calendar">
                {result.monthly.map((month) => (
                  <div className={`demand-month band-${month.demandBand.toLowerCase()}`} key={month.month}>
                    <strong>{month.month}</strong>
                    <span>{month.demandBand}</span>
                    <small>{month.multiplier.toFixed(2)}×</small>
                  </div>
                ))}
              </div>
              <div className="demand-legend">
                <span><i className="legend-peak" /> Peak</span>
                <span><i className="legend-strong" /> Strong</span>
                <span><i className="legend-steady" /> Steady</span>
                <span><i className="legend-value" /> Value</span>
              </div>
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

            {input.ownerUseNights > 0 && (
              <div className="owner-use-card">
                <div className="owner-use-icon"><Home size={24} /></div>
                <div>
                  <div className="eyebrow">Owner-use impact</div>
                  <h3>{input.ownerUseNights} personal nights are included</h3>
                  <p>
                    This projection reduces potential gross by approximately <strong>{currency.format(result.ownerUseImpact)}</strong>.
                    Value-season stays generally preserve more rental income than peak-season stays.
                  </p>
                </div>
                <div className="owner-use-number">
                  <span>Before owner use</span>
                  <strong>{currency.format(result.annualGrossBeforeOwnerUse)}</strong>
                </div>
              </div>
            )}

            <div className="context-grid">
              <div className="panel panel-pad">
                <div className="eyebrow">Local market</div>
                <h3 className="context-title">{result.market.label}</h3>
                <p className="context-copy">{result.market.summary}</p>
                <div className="market-fact">
                  <TrendingUp size={18} />
                  <span><strong>Demand pattern</strong>{result.market.demandPattern}</span>
                </div>
                <div className="market-fact">
                  <Compass size={18} />
                  <span><strong>Guest appeal</strong>{result.market.guestAppeal}</span>
                </div>
              </div>

              <div className="panel panel-pad">
                <div className="eyebrow">Booking behavior</div>
                <h3 className="context-title">When guests plan</h3>
                <p className="context-copy">
                  Larger and higher-end homes generally shift more demand into longer planning windows.
                </p>
                <div className="booking-bars">
                  {result.bookingWindows.map((window) => (
                    <div className="booking-row" key={window.label}>
                      <span>{window.label}</span>
                      <div><i style={{ width: `${window.share * 100}%` }} /></div>
                      <strong>{Math.round(window.share * 100)}%</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {input.strengths.length > 0 && (
              <div className="panel panel-pad">
                <div className="panel-title">
                  <div>
                    <div className="eyebrow">Property positioning</div>
                    <h3 style={{ marginTop: 9 }}>Strengths to feature</h3>
                  </div>
                  <Sparkles color="#f8b91c" />
                </div>
                <div className="strength-summary">
                  {input.strengths.map((strength) => <span key={strength}><Check size={14} /> {strength}</span>)}
                </div>
                <p className="form-help" style={{ marginTop: 16 }}>
                  These features help shape listing strategy and guest appeal. They are documented here without applying unsupported revenue premiums.
                </p>
              </div>
            )}

            <div className="skyrun-value-card">
              <div>
                <div className="eyebrow light">The SkyRun difference</div>
                <h3>Local execution turns potential into performance.</h3>
                <p>The estimate is the starting point. Pricing, presentation, responsiveness, and consistent property care determine how well a home competes.</p>
              </div>
              <div className="value-list">
                {SKYRUN_VALUE.map((item) => <span key={item}><ShieldCheck size={17} /> {item}</span>)}
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
                    <div><strong>{scenario.label}</strong><br /><small>{Math.round(scenario.occupancy * 100)}% potential occupancy · {currency.format(scenario.averageRate)} avg. nightly</small></div>
                    <strong>{currency.format(scenario.gross)}</strong>
                  </div>
                ))}
              </div>
              <details className="methodology">
                <summary><Info size={16} /> How this estimate was built</summary>
                <div>
                  <p>
                    The projection combines {result.market.label} seasonality, the selected base rate and occupancy,
                    bedroom-driven booking behavior, property style, management fee, and planned owner use.
                    {input.petsAllowed ? " The Brian Head pet-friendly booking adjustment is also included." : ""}
                  </p>
                  <p>
                    It is directional—not a promise or guarantee. Actual results vary with property condition, guest demand,
                    market supply, owner use, pricing strategy, weather, and the quality of ongoing operations.
                  </p>
                </div>
              </details>
            </div>
            <div className="print-report-footer">
              <span>SkyRun Brian Head · 435.990.4004 · brianhead@skyrun.com</span>
              <span>Directional estimate—not a guarantee of future performance.</span>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function normalizeSavedInput(estimate: SavedEstimate): EstimateInput {
  const snapshot = estimate.input_snapshot || {};
  const market = stringValue(snapshot.market, estimate.market);
  const bedrooms = stringValue(snapshot.bedrooms, estimate.bedrooms);
  const propertyStyle = stringValue(snapshot.propertyStyle, estimate.property_style);
  const ownerUseTiming = stringValue(snapshot.ownerUseTiming, defaultEstimateInput.ownerUseTiming);

  return {
    ...defaultEstimateInput,
    ownerName: stringValue(snapshot.ownerName, estimate.owner_name),
    ownerEmail: stringValue(snapshot.ownerEmail, estimate.owner_email),
    phone: stringValue(snapshot.phone, estimate.phone),
    propertyAddress: stringValue(snapshot.propertyAddress, estimate.property_address),
    market: market in MARKETS ? market as EstimateInput["market"] : defaultEstimateInput.market,
    bedrooms: ["Studio", "1BR", "2BR", "3BR", "4+BR"].includes(bedrooms)
      ? bedrooms as EstimateInput["bedrooms"]
      : defaultEstimateInput.bedrooms,
    propertyStyle: ["Condo / Standard", "Cabin / Chalet", "Luxury"].includes(propertyStyle)
      ? propertyStyle as EstimateInput["propertyStyle"]
      : defaultEstimateInput.propertyStyle,
    baseRate: numberValue(snapshot.baseRate, estimate.base_rate),
    occupancyPct: numberValue(snapshot.occupancyPct, estimate.occupancy_pct),
    managementFeePct: numberValue(snapshot.managementFeePct, estimate.management_fee_pct),
    petsAllowed: booleanValue(snapshot.petsAllowed, estimate.pets_allowed),
    ownerUseNights: numberValue(snapshot.ownerUseNights, 0),
    ownerUseTiming: ["peak", "mixed", "value"].includes(ownerUseTiming)
      ? ownerUseTiming as EstimateInput["ownerUseTiming"]
      : defaultEstimateInput.ownerUseTiming,
    strengths: Array.isArray(snapshot.strengths) ? snapshot.strengths.filter((item): item is string => typeof item === "string") : [],
    notes: stringValue(snapshot.notes, estimate.notes)
  };
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value ? value : fallback;
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : Number(fallback || 0);
}

function booleanValue(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null) {
    const maybeError = error as { message?: unknown; details?: unknown; hint?: unknown };
    const pieces = [maybeError.message, maybeError.details, maybeError.hint].filter((piece): piece is string => typeof piece === "string" && piece.length > 0);
    if (pieces.length > 0) return pieces.join(" ");
  }
  return fallback;
}
