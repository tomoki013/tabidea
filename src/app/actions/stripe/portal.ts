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
    apiVersion: '2026-01-28.clover' as any, // Type assertion for newer API version
  });

  // Supabaseからstripe_customer_idとis_adminを取得
  const supabase = await createClient();
  const { data: userData, error } = await supabase
    .from('users')
    .select('stripe_customer_id, is_admin')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('User data fetch error:', error);
    redirect('/pricing?error=unknown');
  }

  // 管理者の場合
  if (userData?.is_admin) {
    // 管理者はポータルへ行かせず、管理画面である旨を伝える（が、Server Actionなのでリダイレクトするしかない）
    // クライアント側でボタンを制御しているはずだが、直接叩かれた場合のガード
    redirect('/pricing?error=admin_account');
  }

  if (!userData?.stripe_customer_id) {
    console.error('Stripe customer ID not found');
    redirect('/pricing?error=no_subscription');
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  // 末尾のスラッシュを削除して正規化
  const returnUrl = `${baseUrl.replace(/\/$/, '')}/pricing`;

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: userData.stripe_customer_id,
      return_url: returnUrl,
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
