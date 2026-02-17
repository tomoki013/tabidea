'use server';

import { revalidatePath } from 'next/cache';

import { createClient, getUser } from '@/lib/supabase/server';

export async function getShioriLikeState(slug: string) {
  const supabase = await createClient();
  const user = await getUser();

  const { data: publication } = await supabase
    .from('plan_publications')
    .select('id, visibility')
    .eq('slug', slug)
    .maybeSingle();

  if (!publication || publication.visibility !== 'public') {
    return { success: false, error: '旅のしおりが見つかりません。' };
  }

  const { count } = await supabase
    .from('shiori_likes')
    .select('id', { count: 'exact', head: true })
    .eq('publication_id', publication.id);

  if (!user) {
    return {
      success: true,
      liked: false,
      likesCount: count ?? 0,
      canLike: false,
    };
  }

  const { data: existingLike } = await supabase
    .from('shiori_likes')
    .select('id')
    .eq('publication_id', publication.id)
    .eq('user_id', user.id)
    .maybeSingle();

  return {
    success: true,
    liked: Boolean(existingLike),
    likesCount: count ?? 0,
    canLike: true,
  };
}

export async function toggleShioriLike(slug: string) {
  const user = await getUser();
  if (!user) {
    return { success: false, error: 'いいねするにはログインが必要です。', requiresAuth: true };
  }

  const supabase = await createClient();
  const { data: publication } = await supabase
    .from('plan_publications')
    .select('id, visibility')
    .eq('slug', slug)
    .maybeSingle();

  if (!publication || publication.visibility !== 'public') {
    return { success: false, error: '旅のしおりが見つかりません。' };
  }

  const { data: existingLike, error: existingError } = await supabase
    .from('shiori_likes')
    .select('id')
    .eq('publication_id', publication.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingError) {
    return { success: false, error: existingError.message };
  }

  if (existingLike) {
    const { error: deleteError } = await supabase
      .from('shiori_likes')
      .delete()
      .eq('id', existingLike.id)
      .eq('user_id', user.id);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }
  } else {
    const { error: insertError } = await supabase
      .from('shiori_likes')
      .insert({
        publication_id: publication.id,
        user_id: user.id,
      });

    if (insertError) {
      return { success: false, error: insertError.message };
    }
  }

  const { count, error: countError } = await supabase
    .from('shiori_likes')
    .select('id', { count: 'exact', head: true })
    .eq('publication_id', publication.id);

  if (countError) {
    return { success: false, error: countError.message };
  }

  revalidatePath(`/shiori/${slug}`);
  revalidatePath('/shiori');

  return {
    success: true,
    liked: !existingLike,
    likesCount: count ?? 0,
  };
}
