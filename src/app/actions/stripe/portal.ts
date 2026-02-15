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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // Verify the customer exists in Stripe before creating portal session
    try {
      const customer = await stripe.customers.retrieve(userData.stripe_customer_id);
      if ((customer as Stripe.DeletedCustomer).deleted) {
        console.error('Stripe customer has been deleted');
        return { success: false, error: 'no_subscription' };
      }
    } catch (customerErr) {
      console.error('Stripe customer not found:', customerErr);
      return { success: false, error: 'no_subscription' };
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: userData.stripe_customer_id,
      return_url: returnUrl,
    });

    if (session.url) {
      return { success: true, url: session.url };
    }
  } catch (err: unknown) {
    const stripeErr = err as { type?: string; message?: string };
    console.error('Failed to create portal session:', stripeErr.message || err);

    // Provide more specific error messages
    if (stripeErr.type === 'StripeInvalidRequestError') {
      if (stripeErr.message?.includes('portal configuration')) {
        return { success: false, error: 'portal_not_configured' };
      }
    }

    return { success: false, error: 'portal_failed' };
  }

  return { success: false, error: 'unknown' };
}
