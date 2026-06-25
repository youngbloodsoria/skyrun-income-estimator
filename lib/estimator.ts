export const MARKETS = {
  brianhead: {
    label: "Brian Head",
    summary: "A true four-season mountain market with winter as the primary revenue engine and a meaningful summer event and recreation season.",
    demandPattern: "Demand is strongest from December through March, with July providing a valuable second-season lift.",
    guestAppeal: "Ski access, hot tubs, winter-ready parking, mountain views, and easy access to lifts tend to matter most to guests.",
    seasonality: [1.3, 1.25, 1.2, 0.8, 0.7, 0.8, 1, 0.85, 0.75, 0.7, 0.85, 1.4]
  },
  duckcreek: {
    label: "Duck Creek",
    summary: "A cabin-oriented escape market centered on forest access, outdoor recreation, and longer warm-weather stays.",
    demandPattern: "June through August leads the year, while winter weekends and holiday travel provide a smaller secondary season.",
    guestAppeal: "Cabin character, decks, fireplaces, trailer parking, pet-friendly policies, and access to trails and lakes strengthen the offer.",
    seasonality: [1.1, 1.1, 0.8, 0.85, 0.95, 1.3, 1.35, 1.3, 1.1, 0.85, 0.8, 1.1]
  },
  panguitch: {
    label: "Panguitch / Panguitch Lake",
    summary: "A warm-season destination supported by lake recreation, scenic drives, fishing, and access to Southern Utah attractions.",
    demandPattern: "The broadest demand window runs from May through September, with July typically carrying the strongest pricing power.",
    guestAppeal: "Lake proximity, outdoor gathering space, family capacity, views, and convenient regional access are meaningful differentiators.",
    seasonality: [0.7, 0.75, 0.9, 1, 1.1, 1.25, 1.3, 1.25, 1.05, 0.9, 0.8, 0.7]
  }
} as const;

export type MarketKey = keyof typeof MARKETS;
export type Bedroom = "Studio" | "1BR" | "2BR" | "3BR" | "4+BR";
export type PropertyStyle = "Condo / Standard" | "Cabin / Chalet" | "Luxury";
export type OwnerUseTiming = "peak" | "mixed" | "value";

export const PROPERTY_STRENGTHS = [
  "Near lifts / ski access",
  "Private hot tub",
  "Mountain or lake views",
  "Updated interior",
  "Garage / covered parking",
  "Fireplace",
  "High-speed internet",
  "EV charging",
  "Easy winter access"
] as const;

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
  ownerUseNights: number;
  ownerUseTiming: OwnerUseTiming;
  strengths: string[];
  notes: string;
};

const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PET_UPLIFT = 0.203;
const BOOKING_WINDOW_LABELS = ["0–7 days", "8–30 days", "31–60 days", "61–120 days", "120+ days"];

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

  const buildMonthly = (scenarioOccupancy: number, scenarioRate: number, includeOwnerUse = true) => {
    const ownerNights = includeOwnerUse
      ? distributeOwnerUse(input.ownerUseNights, input.ownerUseTiming, market.seasonality, scenarioOccupancy)
      : Array(12).fill(0);

    return MONTHS.map((month, index) => {
      const multiplier = market.seasonality[index];
      const rate = scenarioRate * multiplier;
      const potentialOccupiedNights = Math.round(DAYS[index] * scenarioOccupancy);
      const usedByOwner = Math.min(ownerNights[index], potentialOccupiedNights);
      const occupiedNights = Math.max(0, potentialOccupiedNights - usedByOwner);
      return {
        month,
        nights: DAYS[index],
        multiplier,
        demandBand: getDemandBand(multiplier),
        potentialOccupiedNights,
        ownerNights: usedByOwner,
        occupiedNights,
        rate,
        revenue: rate * occupiedNights
      };
    });
  };

  const monthlyBeforeOwnerUse = buildMonthly(occupancy, input.baseRate, false);
  const monthly = buildMonthly(occupancy, input.baseRate);
  const annualGrossBeforeOwnerUse = sumRevenue(monthlyBeforeOwnerUse);
  const annualGross = sumRevenue(monthly);
  const ownerUseImpact = annualGrossBeforeOwnerUse - annualGross;
  const nightsBooked = monthly.reduce((sum, item) => sum + item.occupiedNights, 0);
  const averageNightlyRate = nightsBooked ? annualGross / nightsBooked : 0;
  const netToOwner = annualGross * (1 - input.managementFeePct / 100);

  const baseGross = sumRevenue(buildMonthly(baseOccupancy, input.baseRate));

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
    gross: sumRevenue(buildMonthly(scenario.occupancy, scenario.rate))
  }));

  const winterRevenue = monthly.filter((_, index) => [11, 0, 1, 2].includes(index)).reduce((sum, item) => sum + item.revenue, 0);
  const summerRevenue = monthly.filter((_, index) => [5, 6, 7].includes(index)).reduce((sum, item) => sum + item.revenue, 0);
  const peakMonths = [...monthly].sort((a, b) => b.revenue - a.revenue).slice(0, 3).map((item) => item.month);
  const shortLeadShare = leadCurve[0] + leadCurve[1];
  const longLeadShare = leadCurve[2] + leadCurve[3] + leadCurve[4];

  const insights = [
    input.market === "brianhead"
      ? `Winter contributes about ${Math.round((winterRevenue / Math.max(annualGross, 1)) * 100)}% of this projection, with ${peakMonths.join(", ")} leading revenue.`
      : `Summer contributes about ${Math.round((summerRevenue / Math.max(annualGross, 1)) * 100)}% of this projection, with ${peakMonths.join(", ")} leading revenue.`,
    input.ownerUseNights > 0
      ? `${input.ownerUseNights} planned owner nights reduce projected gross by about ${currency.format(ownerUseImpact)}—timing those stays in value season preserves more revenue.`
      : `The model projects ${nightsBooked} guest nights annually before any personal owner stays are added.`,
    input.petsAllowed
      ? `The Brian Head dataset’s 20.3% pet-friendly booking uplift adds approximately ${currency.format(Math.max(0, annualGross - baseGross))} to this scenario.`
      : `${Math.round(shortLeadShare * 100)}% of modeled bookings arrive within 30 days; ${Math.round(longLeadShare * 100)}% plan 31 days or more ahead.`
  ];

  return {
    market,
    marketLabel: market.label,
    annualGross,
    annualGrossBeforeOwnerUse,
    ownerUseImpact,
    nightsBooked,
    averageNightlyRate,
    occupancyPct: (nightsBooked / 365) * 100,
    netToOwner,
    petIncrementalRevenue: Math.max(0, annualGross - baseGross),
    monthly,
    leadCurve,
    bookingWindows: leadCurve.map((share, index) => ({ label: BOOKING_WINDOW_LABELS[index], share })),
    scenarios,
    insights,
    peakMonths,
    winterRevenueShare: winterRevenue / Math.max(annualGross, 1),
    summerRevenueShare: summerRevenue / Math.max(annualGross, 1)
  };
}

function distributeOwnerUse(
  requestedNights: number,
  timing: OwnerUseTiming,
  seasonality: readonly number[],
  occupancy: number
) {
  const allocation = Array(12).fill(0);
  let remaining = Math.max(0, Math.min(120, Math.round(requestedNights || 0)));
  const ordered = seasonality.map((value, index) => ({ value, index })).sort((a, b) => b.value - a.value);
  const selected = timing === "peak"
    ? ordered.slice(0, 4)
    : timing === "value"
      ? ordered.slice(-4).reverse()
      : MONTHS.map((_, index) => ({ value: seasonality[index], index }));

  while (remaining > 0) {
    let placed = false;
    for (const { index } of selected) {
      const capacity = Math.round(DAYS[index] * occupancy);
      if (allocation[index] < capacity && remaining > 0) {
        allocation[index] += 1;
        remaining -= 1;
        placed = true;
      }
    }
    if (!placed) break;
  }
  return allocation;
}

function getDemandBand(multiplier: number) {
  if (multiplier >= 1.2) return "Peak";
  if (multiplier >= 1) return "Strong";
  if (multiplier >= 0.85) return "Steady";
  return "Value";
}

function sumRevenue(monthly: Array<{ revenue: number }>) {
  return monthly.reduce((sum, item) => sum + item.revenue, 0);
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
  ownerUseNights: 0,
  ownerUseTiming: "mixed",
  strengths: [],
  notes: ""
};

export const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});
