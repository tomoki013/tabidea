'use server';

import { revalidatePath } from 'next/cache';

import { getUser, createClient } from '@/lib/supabase/server';
import { buildDefaultPublicationSlug } from '@/lib/plans/normalized';

async function assertUser() {
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}

export async function updatePlanItemDetails(input: {
  itemId: string;
  actualCost: number | null;
  actualCurrency: string;
  note: string | null;
}) {
  const user = await assertUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from('plan_items')
    .update({
      actual_cost: input.actualCost,
      actual_currency: input.actualCurrency,
      note: input.note,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.itemId)
    .eq('user_id', user.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function upsertBooking(input: {
  itemId: string;
  planId: string;
  bookingUrl: string | null;
  bookingReference: string | null;
  provider: string | null;
  memo: string | null;
}) {
  const user = await assertUser();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('item_bookings')
    .select('id')
    .eq('item_id', input.itemId)
    .eq('user_id', user.id)
    .eq('is_primary', true)
    .maybeSingle();

  const payload = {
    item_id: input.itemId,
    plan_id: input.planId,
    user_id: user.id,
    booking_url: input.bookingUrl,
    booking_reference: input.bookingReference,
    provider: input.provider,
    memo: input.memo,
    is_primary: true,
    status: 'booked',
    updated_at: new Date().toISOString(),
  };

  const query = existing
    ? supabase.from('item_bookings').update(payload).eq('id', existing.id)
    : supabase.from('item_bookings').insert(payload);

  const { error } = await query;
  if (error) return { success: false, error: error.message };

  return { success: true };
}

export async function syncJournalEntry(input: {
  itemId: string;
  planId: string;
  content: string;
  editedAt: string;
}) {
  const user = await assertUser();
  const supabase = await createClient();

  const { error } = await supabase.from('journal_entries').upsert({
    item_id: input.itemId,
    plan_id: input.planId,
    user_id: user.id,
    content: input.content,
    last_edited_at: input.editedAt,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'item_id,user_id' });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function upsertPlanPublication(input: {
  planId: string;
  destination?: string | null;
  visibility: 'private' | 'unlisted' | 'public';
  publishJournal: boolean;
  publishBudget: boolean;
}) {
  const user = await assertUser();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('plan_publications')
    .select('slug, unlisted_token')
    .eq('plan_id', input.planId)
    .eq('user_id', user.id)
    .maybeSingle();

  const slug = existing?.slug ?? buildDefaultPublicationSlug(input.destination ?? null);
  const unlistedToken = input.visibility === 'unlisted'
    ? existing?.unlisted_token ?? crypto.randomUUID().replace(/-/g, '').slice(0, 18)
    : null;

  const { error } = await supabase.from('plan_publications').upsert({
    plan_id: input.planId,
    user_id: user.id,
    slug,
    visibility: input.visibility,
    unlisted_token: unlistedToken,
    publish_journal: input.publishJournal,
    publish_budget: input.publishBudget,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'plan_id' });

  if (error) return { success: false, error: error.message };

  revalidatePath(`/plan/id/${input.planId}`);
  revalidatePath(`/shiori/${slug}`);

  return { success: true, slug, unlistedToken };
}

export async function adoptExternalSelection(input: {
  itemId: string;
  provider: string;
  externalId: string;
  deeplink?: string | null;
  priceSnapshot?: {
    amount: number | null;
    currency: string | null;
  };
  metadata?: Record<string, unknown>;
}) {
  const user = await assertUser();
  const supabase = await createClient();

  const { data: item, error: itemError } = await supabase
    .from('plan_items')
    .select('id, plan_id, user_id')
    .eq('id', input.itemId)
    .eq('user_id', user.id)
    .single();

  if (itemError || !item) return { success: false, error: '対象のプラン項目が見つかりません。' };

  const { error } = await supabase
    .from('plan_item_external_selections')
    .upsert({
      item_id: input.itemId,
      provider: input.provider,
      external_id: input.externalId,
      deeplink: input.deeplink ?? null,
      price_snapshot: input.priceSnapshot ?? null,
      metadata_json: input.metadata ?? null,
      created_at: new Date().toISOString(),
    }, { onConflict: 'item_id,provider,external_id' });

  if (error) return { success: false, error: error.message };

  revalidatePath(`/plan/id/${item.plan_id}`);
  return { success: true };
}
