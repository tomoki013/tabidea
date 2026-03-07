'use server';

import { revalidatePath } from 'next/cache';

import { createClient, getUser } from '@/lib/supabase/server';

async function assertUser() {
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}

export async function updatePlanOverallBudget(
  slug: string,
  overallBudget: number | null,
  currency: string,
): Promise<{ success: boolean; error?: string }> {
  const user = await assertUser();
  const supabase = await createClient();

  // Verify ownership: the publication's plan must belong to the current user
  const { data: pub, error: fetchError } = await supabase
    .from('plan_publications')
    .select('id, plans!inner(user_id)')
    .eq('slug', slug)
    .single();

  if (fetchError || !pub) {
    return { success: false, error: 'Publication not found' };
  }

  // @ts-expect-error – Supabase join typing
  const planUserId = pub.plans?.user_id as string | undefined;
  if (planUserId !== user.id) {
    return { success: false, error: 'Forbidden' };
  }

  const { error } = await supabase
    .from('plan_publications')
    .update({
      overall_budget: overallBudget,
      overall_budget_currency: currency,
    })
    .eq('slug', slug);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/shiori/${slug}`);
  return { success: true };
}
