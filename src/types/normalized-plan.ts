export type PlanItemCategory = 'lodging' | 'transport' | 'food' | 'sightseeing' | 'other';

export interface NormalizedBooking {
  id: string;
  booking_url: string | null;
  booking_reference: string | null;
  provider: string | null;
  status: 'planned' | 'booked' | 'cancelled';
  memo: string | null;
}

export interface NormalizedJournal {
  id: string;
  content: string;
  updated_at: string;
}

export interface NormalizedExternalSelection {
  id: string;
  provider: string;
  external_id: string;
  deeplink: string | null;
  price_snapshot: Record<string, unknown> | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
}

export interface NormalizedPlanItem {
  id: string;
  day_id: string;
  day_number: number;
  item_type: 'hotel' | 'spot' | 'transit' | 'meal' | 'other';
  category: PlanItemCategory;
  sort_order: number;
  title: string;
  description: string | null;
  start_time: string | null;
  location: string | null;
  estimated_cost: number | null;
  estimated_currency: string;
  actual_cost: number | null;
  actual_currency: string;
  note: string | null;
  bookings: NormalizedBooking[];
  journal: NormalizedJournal | null;
  external_selections: NormalizedExternalSelection[];
}

export interface NormalizedPlanDay {
  id: string;
  day_number: number;
  title: string | null;
  items: NormalizedPlanItem[];
}

export interface PlanPublication {
  slug: string;
  visibility: 'private' | 'unlisted' | 'public';
  unlisted_token: string | null;
  publish_journal: boolean;
  publish_budget: boolean;
}
