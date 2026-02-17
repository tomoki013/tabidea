import { nanoid } from 'nanoid';

import type { Itinerary } from '@/types';
import { createClient } from '@/lib/supabase/server';
import type {
  NormalizedPlanDay,
  NormalizedPlanItem,
  PlanPublication,
  PlanItemCategory,
} from '@/types/normalized-plan';

function parseMoney(value?: string): number | null {
  if (!value) return null;
  const match = value.replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function detectItemType(activityType?: string): NormalizedPlanItem['item_type'] {
  if (!activityType) return 'other';
  if (activityType === 'accommodation') return 'hotel';
  if (activityType === 'transit') return 'transit';
  if (activityType === 'meal') return 'meal';
  if (activityType === 'spot') return 'spot';
  return 'other';
}

function detectCategory(itemType: NormalizedPlanItem['item_type']): PlanItemCategory {
  switch (itemType) {
    case 'hotel':
      return 'lodging';
    case 'transit':
      return 'transport';
    case 'meal':
      return 'food';
    case 'spot':
      return 'sightseeing';
    default:
      return 'other';
  }
}

export async function ensureNormalizedPlanData(planId: string, userId: string, itinerary: Itinerary) {
  const supabase = await createClient();

  const { count, error: countError } = await supabase
    .from('plan_days')
    .select('id', { count: 'exact', head: true })
    .eq('plan_id', planId)
    .eq('user_id', userId);

  if (countError) throw countError;
  if ((count ?? 0) > 0) return;

  const estimatedFallback = parseMoney(itinerary.estimatedBudget?.dailyExpenses);

  for (const day of itinerary.days) {
    const { data: insertedDay, error: dayError } = await supabase
      .from('plan_days')
      .insert({
        plan_id: planId,
        user_id: userId,
        day_number: day.day,
        title: day.title,
      })
      .select('id')
      .single();

    if (dayError || !insertedDay) throw dayError ?? new Error('Failed to insert day');

    const items = day.activities.map((activity, index) => {
      const itemType = detectItemType(activity.activityType);
      return {
        plan_id: planId,
        day_id: insertedDay.id,
        user_id: userId,
        item_type: itemType,
        category: detectCategory(itemType),
        sort_order: index,
        title: activity.activity,
        description: activity.description,
        start_time: activity.time,
        location: activity.locationEn ?? null,
        estimated_cost: estimatedFallback,
        estimated_currency: itinerary.estimatedBudget?.currency ?? 'JPY',
      };
    });

    if (items.length > 0) {
      const { error: itemError } = await supabase.from('plan_items').insert(items);
      if (itemError) throw itemError;
    }
  }
}

export async function getNormalizedPlanData(planId: string, userId: string): Promise<{
  days: NormalizedPlanDay[];
  publication: PlanPublication | null;
}> {
  const supabase = await createClient();

  const { data: days, error } = await supabase
    .from('plan_days')
    .select(`
      id,
      day_number,
      title,
      items:plan_items(
        id,day_id,item_type,category,sort_order,title,description,start_time,location,
        estimated_cost,estimated_currency,actual_cost,actual_currency,note,
        bookings:item_bookings(id,booking_url,booking_reference,provider,status,memo),
        journal:journal_entries(id,content,phase,place_name,photo_urls,visibility,updated_at)
      )
    `)
    .eq('plan_id', planId)
    .eq('user_id', userId)
    .order('day_number', { ascending: true });

  if (error) throw error;

  const { data: publication } = await supabase
    .from('plan_publications')
    .select('slug,visibility,unlisted_token,publish_journal,publish_budget')
    .eq('plan_id', planId)
    .eq('user_id', userId)
    .maybeSingle();

  const normalizedDays: NormalizedPlanDay[] = (days ?? []).map((day) => ({
    id: day.id,
    day_number: day.day_number,
    title: day.title,
    items: (day.items ?? []).map((item) => ({
      ...item,
      day_number: day.day_number,
      bookings: item.bookings ?? [],
      journal: Array.isArray(item.journal) ? (item.journal[0] ?? null) : item.journal,
    })),
  }));

  return {
    days: normalizedDays,
    publication: (publication ?? null) as PlanPublication | null,
  };
}

export function buildDefaultPublicationSlug(destination: string | null | undefined) {
  const base = (destination ?? 'trip')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48);
  return `${base || 'trip'}-${nanoid(6).toLowerCase()}`;
}
