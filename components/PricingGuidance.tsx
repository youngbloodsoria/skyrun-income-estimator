import { DollarSign, Info } from "lucide-react";
import { currency } from "@/lib/estimator";
import { PRICING_GUIDANCE } from "@/lib/pricing-guidance";

export function PricingGuidance() {
  const chartMin = 75;
  const chartMax = 625;
  const position = (value: number) => Math.max(0, Math.min(100, ((value - chartMin) / (chartMax - chartMin)) * 100));

  return (
    <section className="panel panel-pad pricing-guide-panel">
      <div className="panel-title">
        <div>
          <div className="eyebrow">Portfolio pricing guide</div>
          <h2 style={{ marginTop: 10 }}>Current base-rate ballparks</h2>
        </div>
        <DollarSign color="#0877bd" />
      </div>
      <p className="context-copy">
        Observed base prices from the 51-listing pricing snapshot supplied in June 2026. Use these as a starting point before adjusting for location, finish quality, amenities, and home type.
      </p>
      <div className="pricing-guide-chart">
        {PRICING_GUIDANCE.map((guide) => (
          <div className="pricing-guide-row" key={guide.bedroom}>
            <strong>{guide.bedroom}</strong>
            <div className="pricing-guide-track">
              <i
                className="pricing-guide-range"
                style={{ left: `${position(guide.low)}%`, width: `${position(guide.high) - position(guide.low)}%` }}
              />
              <i className="pricing-guide-marker" style={{ left: `${position(guide.recommended)}%` }} />
            </div>
            <div className="pricing-guide-values">
              <span>{currency.format(guide.low)}–{currency.format(guide.high)}</span>
              <strong>{currency.format(guide.recommended)} start</strong>
            </div>
          </div>
        ))}
      </div>
      <div className="pricing-guide-table-wrap">
        <table className="table pricing-guide-table">
          <thead><tr><th>Bedrooms</th><th>Observed base range</th><th>Starting point</th><th>Observed minimum floors</th><th>Context</th></tr></thead>
          <tbody>
            {PRICING_GUIDANCE.map((guide) => (
              <tr key={guide.bedroom}>
                <td><strong>{guide.bedroom}</strong></td>
                <td>{currency.format(guide.low)}–{currency.format(guide.high)}</td>
                <td><span className="badge green">{currency.format(guide.recommended)}</span></td>
                <td>{currency.format(guide.observedMinimumLow)}–{currency.format(guide.observedMinimumHigh)}</td>
                <td className="form-help">{guide.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="pricing-guide-disclaimer"><Info size={14} /> These are configured portfolio prices, not achieved ADR, and should not be presented as guaranteed market performance.</p>
    </section>
  );
}
