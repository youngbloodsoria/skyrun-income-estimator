export const MARKETS = {
  brianhead: {
    label: "Brian Head",
    seasonality: [1.3, 1.25, 1.2, 0.8, 0.7, 0.8, 1, 0.85, 0.75, 0.7, 0.85, 1.4]
  },
  duckcreek: {
    label: "Duck Creek",
    seasonality: [1.1, 1.1, 0.8, 0.85, 0.95, 1.3, 1.35, 1.3, 1.1, 0.85, 0.8, 1.1]
  },
  panguitch: {
    label: "Panguitch / Panguitch Lake",
    seasonality: [0.7, 0.75, 0.9, 1, 1.1, 1.25, 1.3, 1.25, 1.05, 0.9, 0.8, 0.7]
  }
} as const;

export type MarketKey = keyof typeof MARKETS;
export type Bedroom = "Studio" | "1BR" | "2BR" | "3BR" | "4+BR";
export type PropertyStyle = "Condo / Standard" | "Cabin / Chalet" | "Luxury";

export type EstimateInput = {
  ownerName: string;
  ownerEmail: string;
  phone: string;
  propertyAddress: string;
  market: MarketKey;
  bedrooms: Bedroom;
  propertyStyle: PropertyStyle;
  baseRate: number;
  occupancyPct: number;
  managementFeePct: number;
  petsAllowed: boolean;
  notes: string;
};

const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PET_UPLIFT = 0.203;

const CURVES: Record<Bedroom, number[]> = {
  Studio: [0.22, 0.38, 0.23, 0.13, 0.04],
  "1BR": [0.22, 0.38, 0.23, 0.13, 0.04],
  "2BR": [0.22, 0.38, 0.23, 0.13, 0.04],
  "3BR": [0.18, 0.34, 0.24, 0.18, 0.06],
  "4+BR": [0.12, 0.32, 0.26, 0.22, 0.08]
};

export function calculateEstimate(input: EstimateInput) {
  const market = MARKETS[input.market];
  const baseOccupancy = Math.min(0.95, Math.max(0.1, input.occupancyPct / 100));
  const occupancy = Math.min(0.95, baseOccupancy * (input.petsAllowed ? 1 + PET_UPLIFT : 1));

  const monthly = MONTHS.map((month, index) => {
    const multiplier = market.seasonality[index];
    const rate = input.baseRate * multiplier;
    const occupiedNights = Math.round(DAYS[index] * occupancy);
    return {
      month,
      nights: DAYS[index],
      multiplier,
      occupiedNights,
      rate,
      revenue: rate * occupiedNights
    };
  });

  const annualGross = monthly.reduce((sum, item) => sum + item.revenue, 0);
  const nightsBooked = monthly.reduce((sum, item) => sum + item.occupiedNights, 0);
  const averageNightlyRate = nightsBooked ? annualGross / nightsBooked : 0;
  const netToOwner = annualGross * (1 - input.managementFeePct / 100);

  const baseGross = MONTHS.reduce((sum, _, index) => {
    const rate = input.baseRate * market.seasonality[index];
    return sum + rate * Math.round(DAYS[index] * baseOccupancy);
  }, 0);

  let leadCurve = [...CURVES[input.bedrooms]];
  const shift = (from: number, to: number, amount: number) => {
    const moved = Math.min(leadCurve[from], amount);
    leadCurve[from] -= moved;
    leadCurve[to] += moved;
  };
  if (input.propertyStyle === "Luxury") {
    shift(1, 2, 0.06);
    shift(0, 1, 0.03);
    shift(3, 4, 0.01);
  } else if (input.propertyStyle === "Cabin / Chalet") {
    shift(1, 2, 0.03);
    shift(0, 1, 0.02);
  }

  const averageMultiplier = market.seasonality.reduce((sum, value) => sum + value, 0) / 12;
  const scenarios = [
    { label: "Conservative", occupancy: Math.max(0.05, occupancy - 0.05), rate: Math.max(30, input.baseRate * 0.88) },
    { label: "Expected", occupancy, rate: input.baseRate },
    { label: "Optimistic", occupancy: Math.min(0.95, occupancy + 0.05), rate: input.baseRate * 1.12 }
  ].map((scenario) => ({
    ...scenario,
    averageRate: scenario.rate * averageMultiplier,
    gross: Math.round(365 * scenario.occupancy) * scenario.rate * averageMultiplier
  }));

  return {
    marketLabel: market.label,
    annualGross,
    nightsBooked,
    averageNightlyRate,
    occupancyPct: occupancy * 100,
    netToOwner,
    petIncrementalRevenue: Math.max(0, annualGross - baseGross),
    monthly,
    leadCurve,
    scenarios
  };
}

export const defaultEstimateInput: EstimateInput = {
  ownerName: "",
  ownerEmail: "",
  phone: "",
  propertyAddress: "",
  market: "brianhead",
  bedrooms: "1BR",
  propertyStyle: "Condo / Standard",
  baseRate: 175,
  occupancyPct: 38,
  managementFeePct: 29.7,
  petsAllowed: false,
  notes: ""
};

export const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});
