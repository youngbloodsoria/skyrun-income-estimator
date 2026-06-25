export type UserRole = "owner" | "employee" | "admin";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
};

export type SavedEstimate = {
  id: string;
  created_at: string;
  updated_at: string;
  owner_name: string;
  owner_email: string;
  phone: string;
  property_address: string;
  market: string;
  bedrooms: string;
  property_style: string;
  base_rate: number;
  occupancy_pct: number;
  management_fee_pct: number;
  pets_allowed: boolean;
  notes: string;
  annual_gross: number;
  net_to_owner: number;
  average_nightly_rate: number;
  nights_booked: number;
  created_by: string;
  input_snapshot: Record<string, unknown>;
  result_snapshot: Record<string, unknown>;
};
