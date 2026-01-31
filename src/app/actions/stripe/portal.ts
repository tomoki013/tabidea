'use server';

import { redirect } from 'next/navigation';
import Stripe from 'stripe';

import { getUser, createClient } from '@/lib/supabase/server';

/**
 * Stripeカスタマーポータルセッションを作成してリダイレクト
 */
export async function createPortalSession(): Promise<void> {
  const user = await getUser();

  if (!user) {
    redirect('/auth/login?redirect=/pricing');
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    console.error('STRIPE_SECRET_KEY is not configured');
    redirect('/pricing?error=configuration');
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2026-01-28.clover',
  });

  // Supabaseからstripe_customer_idを取得
  const supabase = await createClient();
  const { data: userData, error } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  if (error || !userData?.stripe_customer_id) {
    console.error('Stripe customer ID not found:', error);
    redirect('/pricing?error=no_subscription');
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: userData.stripe_customer_id,
      return_url: `${baseUrl}/pricing`,
    });

    if (session.url) {
      redirect(session.url);
    }
  } catch (error) {
    console.error('Failed to create portal session:', error);
    redirect('/pricing?error=portal_failed');
  }

  redirect('/pricing?error=unknown');
}
