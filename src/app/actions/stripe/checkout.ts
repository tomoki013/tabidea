'use server';

import { redirect } from 'next/navigation';
import Stripe from 'stripe';

import { getUser } from '@/lib/supabase/server';

type PlanType = 'pro_monthly' | 'ticket_1' | 'ticket_5' | 'ticket_10';

const PRICE_IDS: Record<PlanType, string> = {
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
  ticket_1: process.env.STRIPE_PRICE_TICKET_1 || '',
  ticket_5: process.env.STRIPE_PRICE_TICKET_5 || '',
  ticket_10: process.env.STRIPE_PRICE_TICKET_10 || '',
};

/**
 * Stripeチェックアウトセッションを作成してリダイレクト
 */
export async function createCheckoutSession(planType: PlanType): Promise<void> {
  const user = await getUser();

  if (!user) {
    redirect('/auth/login?redirect=/pricing');
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    console.error('STRIPE_SECRET_KEY is not configured');
    redirect('/pricing?error=configuration');
  }

  const priceId = PRICE_IDS[planType];
  if (!priceId) {
    console.error(`Price ID not found for plan type: ${planType}`);
    redirect('/pricing?error=invalid_plan');
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2026-01-28.clover',
  });

  const isSubscription = planType === 'pro_monthly';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email || undefined,
      mode: isSubscription ? 'subscription' : 'payment',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing?canceled=true`,
      metadata: {
        user_id: user.id,
        plan_type: planType,
      },
      ...(isSubscription && {
        subscription_data: {
          metadata: {
            user_id: user.id,
          },
        },
      }),
      ...(!isSubscription && {
        payment_intent_data: {
          metadata: {
            user_id: user.id,
            plan_type: planType,
          },
        },
      }),
    });

    if (session.url) {
      redirect(session.url);
    }
  } catch (error) {
    console.error('Failed to create checkout session:', error);
    redirect('/pricing?error=checkout_failed');
  }

  redirect('/pricing?error=unknown');
}
