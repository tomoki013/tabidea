'use server';

import Stripe from 'stripe';

import { getUser, createClient } from '@/lib/supabase/server';

export interface PortalSessionResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Stripeカスタマーポータルセッションを作成してURLを返す
 */
export async function createPortalSession(): Promise<PortalSessionResult> {
  const user = await getUser();

  if (!user) {
    return { success: false, error: 'not_authenticated' };
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    console.error('STRIPE_SECRET_KEY is not configured');
    return { success: false, error: 'configuration' };
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2026-01-28.clover' as any, // Type assertion for newer API version
  });

  // Supabaseからstripe_customer_idを取得
  const supabase = await createClient();
  const { data: userData, error } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('User data fetch error:', error);
    return { success: false, error: 'unknown' };
  }

  if (!userData?.stripe_customer_id) {
    console.error('Stripe customer ID not found');
    return { success: false, error: 'no_subscription' };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!baseUrl) {
    console.error('NEXT_PUBLIC_APP_URL is not configured');
    return { success: false, error: 'configuration' };
  }

  // 末尾のスラッシュを削除して正規化
  const returnUrl = `${baseUrl.replace(/\/$/, '')}/pricing`;

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: userData.stripe_customer_id,
      return_url: returnUrl,
    });

    if (session.url) {
      return { success: true, url: session.url };
    }
  } catch (err) {
    console.error('Failed to create portal session:', err);
    return { success: false, error: 'portal_failed' };
  }

  return { success: false, error: 'unknown' };
}
