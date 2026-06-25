import type { Bedroom } from "@/lib/estimator";

export type PricingGuidance = {
  bedroom: Bedroom;
  low: number;
  recommended: number;
  high: number;
  observedMinimumLow: number;
  observedMinimumHigh: number;
  note: string;
};

export const PRICING_GUIDANCE: PricingGuidance[] = [
  { bedroom: "Studio", low: 83, recommended: 85, high: 87, observedMinimumLow: 52, observedMinimumHigh: 55, note: "Compact condo inventory" },
  { bedroom: "1BR", low: 108, recommended: 128, high: 145, observedMinimumLow: 62, observedMinimumHigh: 89, note: "Location and shared amenities create the spread" },
  { bedroom: "2BR", low: 125, recommended: 165, high: 246, observedMinimumLow: 78, observedMinimumHigh: 196, note: "Condo, hot-tub, and house inventory overlap" },
  { bedroom: "3BR", low: 185, recommended: 245, high: 299, observedMinimumLow: 100, observedMinimumHigh: 239, note: "Premium condos and houses command the upper end" },
  { bedroom: "4+BR", low: 250, recommended: 375, high: 602, observedMinimumLow: 125, observedMinimumHigh: 342, note: "Very wide range due to size, quality, and home type" }
];

export function getPricingGuidance(bedroom: Bedroom) {
  return PRICING_GUIDANCE.find((item) => item.bedroom === bedroom) || PRICING_GUIDANCE[1];
}
