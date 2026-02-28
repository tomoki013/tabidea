// src/app/api/webhooks/stripe/route.ts
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

import { stripe } from "@/lib/stripe/client";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { TICKET_VALIDITY_DAYS } from "@/lib/limits/config";

// ============================================
// Types
// ============================================
interface WebhookResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================
// Main Webhook Handler
// ============================================
export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    console.error("[webhook] Missing stripe-signature header");
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("[webhook] Signature verification failed:", errorMessage);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Use service role client to bypass RLS
  const supabase = createServiceRoleClient();

  console.log(
    `[webhook] Received event: ${event.type} (id: ${event.id})`,
  );

  try {
    let result: WebhookResult;

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        result = await handleCheckoutCompleted(supabase, session, event.id);
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        result = await handleSubscriptionChange(
          supabase,
          subscription,
          event.type,
          event.id,
        );
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        result = await handlePaymentFailed(supabase, invoice, event.id);
        break;
      }
      default: {
        console.log(`[webhook] Unhandled event type: ${event.type}`);
        result = { success: true, message: `Unhandled event type: ${event.type}` };
      }
    }

    console.log(
      `[webhook] Event ${event.id} processed:`,
      JSON.stringify(result),
    );
    return NextResponse.json({ received: true, ...result });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    const errorStack = err instanceof Error ? err.stack : undefined;
    console.error("[webhook] Handler error:", {
      eventId: event.id,
      eventType: event.type,
      error: errorMessage,
      stack: errorStack,
    });
    return NextResponse.json(
      { error: "Webhook handler failed", message: errorMessage },
      { status: 500 },
    );
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Extract subscription period from Stripe Subscription object
 */
function getSubscriptionPeriod(subscription: Stripe.Subscription): {
  periodStart: Date;
  periodEnd: Date;
} {
  const item = subscription.items.data[0];

  if (item?.current_period_start && item?.current_period_end) {
    return {
      periodStart: new Date(item.current_period_start * 1000),
      periodEnd: new Date(item.current_period_end * 1000),
    };
  }

  // Fallback
  const start = subscription.billing_cycle_anchor || subscription.created;
  const end =
    subscription.cancel_at ||
    subscription.canceled_at ||
    start + 30 * 24 * 60 * 60;

  return {
    periodStart: new Date(start * 1000),
    periodEnd: new Date(end * 1000),
  };
}

/**
 * Check if a transaction has already been processed (idempotency check)
 */
async function isTransactionProcessed(
  supabase: SupabaseClient,
  externalTransactionId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("billing_transactions")
    .select("id")
    .eq("external_transaction_id", externalTransactionId)
    .maybeSingle();

  if (error) {
    console.warn(
      `[webhook] Error checking transaction existence: ${error.message}`,
    );
    return false;
  }

  return !!data;
}

/**
 * Link Stripe Customer ID to user
 */
async function linkStripeCustomerToUser(
  supabase: SupabaseClient,
  userId: string,
  customerId: string,
): Promise<void> {
  const { error } = await supabase
    .from("users")
    .update({ stripe_customer_id: customerId })
    .eq("id", userId);

  if (error) {
    console.error(
      `[webhook] Failed to link stripe_customer_id to user:`,
      { userId, customerId, error: error.message },
    );
    throw new Error(`Failed to link customer: ${error.message}`);
  }

  console.log(
    `[webhook] Linked stripe_customer_id ${customerId} to user ${userId}`,
  );
}

/**
 * Find user by Stripe Customer ID
 */
async function findUserByCustomerId(
  supabase: SupabaseClient,
  customerId: string,
): Promise<{ id: string } | null> {
  // First, try to find by stripe_customer_id
  const { data: userByCustomerId, error: customerError } = await supabase
    .from("users")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (customerError) {
    console.warn(
      `[webhook] Error finding user by customer_id: ${customerError.message}`,
    );
  }

  if (userByCustomerId) {
    return userByCustomerId;
  }

  // Fallback: Find by subscription's external_customer_id
  const { data: subscription, error: subError } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("external_customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subError) {
    console.warn(
      `[webhook] Error finding user by subscription: ${subError.message}`,
    );
  }

  if (subscription) {
    // Link the customer_id to the user for future lookups
    await supabase
      .from("users")
      .update({ stripe_customer_id: customerId })
      .eq("id", subscription.user_id);

    return { id: subscription.user_id };
  }

  return null;
}

// ============================================
// Event Handlers
// ============================================

/**
 * Handle checkout.session.completed event
 */
async function handleCheckoutCompleted(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
  eventId: string,
): Promise<WebhookResult> {
  const userId = session.metadata?.user_id;
  const planType = session.metadata?.plan_type;
  const ticketCount = parseInt(session.metadata?.ticket_count || "0", 10);
  const customerId = session.customer as string;

  console.log("[webhook] handleCheckoutCompleted:", {
    eventId,
    sessionId: session.id,
    userId,
    planType,
    customerId,
    ticketCount,
  });

  // Validate required metadata
  if (!userId || !planType) {
    console.error("[webhook] Missing required metadata:", {
      userId,
      planType,
      sessionMetadata: session.metadata,
    });
    return {
      success: false,
      message: "Missing required metadata (user_id or plan_type)",
    };
  }

  // Generate idempotency key from payment_intent or subscription
  const externalTransactionId =
    (session.payment_intent as string) || (session.subscription as string);

  if (!externalTransactionId) {
    console.error("[webhook] No payment_intent or subscription in session");
    return {
      success: false,
      message: "No payment reference in session",
    };
  }

  // Idempotency check
  const alreadyProcessed = await isTransactionProcessed(
    supabase,
    externalTransactionId,
  );

  if (alreadyProcessed) {
    console.log(
      `[webhook] Transaction already processed: ${externalTransactionId}`,
    );
    return {
      success: true,
      message: "Transaction already processed (idempotent)",
    };
  }

  // Link Stripe Customer ID to user (critical for future events)
  if (customerId) {
    try {
      await linkStripeCustomerToUser(supabase, userId, customerId);
    } catch (err) {
      // Log but don't fail - the user might already have a customer_id
      console.warn("[webhook] Could not link customer_id:", err);
    }
  }

  const isSubscriptionPlan = ["pro_monthly", "premium_monthly", "premium_yearly"].includes(planType);

  if (isSubscriptionPlan) {
    // Handle subscription
    const subscriptionId = session.subscription as string;

    if (!subscriptionId) {
      console.error(`[webhook] No subscription ID for ${planType} plan`);
      return {
        success: false,
        message: "No subscription ID for subscription plan",
      };
    }

    // Retrieve full subscription details from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const item = subscription.items.data[0];

    console.log("[webhook] Subscription details:", {
      subscriptionId,
      status: subscription.status,
      customerId: subscription.customer,
      planCode: planType,
      periodStart: item?.current_period_start,
      periodEnd: item?.current_period_end,
    });

    // Upsert subscription (using UNIQUE constraint on external_subscription_id)
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from("subscriptions")
      .upsert(
        {
          user_id: userId,
          external_subscription_id: subscriptionId,
          external_customer_id: customerId,
          payment_provider: "stripe",
          status: subscription.status,
          plan_code: planType,
          current_period_start: item?.current_period_start
            ? new Date(item.current_period_start * 1000).toISOString()
            : new Date().toISOString(),
          current_period_end: item?.current_period_end
            ? new Date(item.current_period_end * 1000).toISOString()
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
        },
        {
          onConflict: "external_subscription_id",
        },
      )
      .select()
      .single();

    if (subscriptionError) {
      console.error("[webhook] Failed to upsert subscription:", {
        error: subscriptionError.message,
        code: subscriptionError.code,
        details: subscriptionError.details,
      });
      throw new Error(`Subscription upsert failed: ${subscriptionError.message}`);
    }

    console.log("[webhook] Subscription upserted:", subscriptionData?.id);
  } else {
    // Handle ticket pack purchase
    if (ticketCount <= 0) {
      console.error("[webhook] Invalid ticket count:", ticketCount);
      return {
        success: false,
        message: "Invalid ticket count",
      };
    }

    const { data: grantData, error: grantError } = await supabase
      .from("entitlement_grants")
      .insert({
        user_id: userId,
        entitlement_type: "plan_generation",
        grant_type: "ticket_pack",
        granted_count: ticketCount,
        remaining_count: ticketCount,
        valid_from: new Date().toISOString(),
        valid_until: new Date(
          Date.now() + (TICKET_VALIDITY_DAYS[planType as keyof typeof TICKET_VALIDITY_DAYS] ?? 180) * 24 * 60 * 60 * 1000,
        ).toISOString(),
        source_type: "stripe",
        source_id: session.id,
        status: "active",
        metadata: {
          checkout_session_id: session.id,
          plan_type: planType,
          event_id: eventId,
        },
      })
      .select()
      .single();

    if (grantError) {
      console.error("[webhook] Failed to create entitlement grant:", {
        error: grantError.message,
        code: grantError.code,
      });
      throw new Error(`Entitlement grant failed: ${grantError.message}`);
    }

    console.log("[webhook] Entitlement grant created:", grantData?.id);
  }

  // Record billing transaction (using UNIQUE constraint for idempotency)
  const { error: transactionError } = await supabase
    .from("billing_transactions")
    .upsert(
      {
        user_id: userId,
        transaction_type: isSubscriptionPlan ? "subscription" : "ticket_purchase",
        amount: session.amount_total || 0,
        currency: session.currency || "usd",
        payment_provider: "stripe",
        external_transaction_id: externalTransactionId,
        status: "succeeded",
        metadata: {
          plan_type: planType,
          ticket_count: ticketCount,
          checkout_session_id: session.id,
          event_id: eventId,
        },
      },
      {
        onConflict: "external_transaction_id",
        ignoreDuplicates: true,
      },
    );

  if (transactionError) {
    console.error("[webhook] Failed to record transaction:", {
      error: transactionError.message,
      code: transactionError.code,
    });
    // Don't throw - transaction recording is for audit, not critical path
  }

  return {
    success: true,
    message: `Checkout completed for ${planType}`,
    details: {
      userId,
      planType,
      ticketCount: !isSubscriptionPlan ? ticketCount : undefined,
    },
  };
}

/**
 * Handle subscription update/delete events
 */
async function handleSubscriptionChange(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription,
  eventType: string,
  eventId: string,
): Promise<WebhookResult> {
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;
  const { periodStart, periodEnd } = getSubscriptionPeriod(subscription);

  console.log("[webhook] handleSubscriptionChange:", {
    eventId,
    eventType,
    subscriptionId,
    customerId,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });

  // Find the user
  const user = await findUserByCustomerId(supabase, customerId);

  if (!user) {
    console.error("[webhook] User not found for customer:", {
      customerId,
      subscriptionId,
      eventType,
    });

    // Try to find by subscription ID as last resort
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("external_subscription_id", subscriptionId)
      .maybeSingle();

    if (!existingSub) {
      return {
        success: false,
        message: `User not found for customer: ${customerId}`,
      };
    }

    // Update using subscription record
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        status: subscription.status,
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at:
          eventType === "customer.subscription.deleted"
            ? new Date().toISOString()
            : null,
      })
      .eq("external_subscription_id", subscriptionId);

    if (updateError) {
      console.error("[webhook] Failed to update subscription:", {
        error: updateError.message,
      });
      throw new Error(`Subscription update failed: ${updateError.message}`);
    }

    return {
      success: true,
      message: `Subscription ${eventType} processed (found by subscription_id)`,
    };
  }

  // Update subscription
  const { error: updateError } = await supabase
    .from("subscriptions")
    .update({
      status: subscription.status,
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at:
        eventType === "customer.subscription.deleted"
          ? new Date().toISOString()
          : null,
    })
    .eq("external_subscription_id", subscriptionId);

  if (updateError) {
    console.error("[webhook] Failed to update subscription:", {
      userId: user.id,
      subscriptionId,
      error: updateError.message,
    });
    throw new Error(`Subscription update failed: ${updateError.message}`);
  }

  console.log("[webhook] Subscription updated:", {
    userId: user.id,
    subscriptionId,
    newStatus: subscription.status,
  });

  return {
    success: true,
    message: `Subscription ${eventType} processed`,
    details: {
      userId: user.id,
      status: subscription.status,
    },
  };
}

/**
 * Handle payment failure events
 */
async function handlePaymentFailed(
  supabase: SupabaseClient,
  invoice: Stripe.Invoice,
  eventId: string,
): Promise<WebhookResult> {
  const customerId = invoice.customer as string;
  // Invoice may contain subscription reference in parent_invoice or lines
  const subscriptionId =
    (invoice as unknown as { subscription?: string | null }).subscription ||
    null;
  const invoiceId = invoice.id;

  console.log("[webhook] handlePaymentFailed:", {
    eventId,
    invoiceId,
    customerId,
    subscriptionId,
    amountDue: invoice.amount_due,
    attemptCount: invoice.attempt_count,
  });

  // Find the user
  const user = await findUserByCustomerId(supabase, customerId);

  if (!user) {
    console.error("[webhook] User not found for failed payment:", {
      customerId,
      invoiceId,
    });
    return {
      success: false,
      message: `User not found for customer: ${customerId}`,
    };
  }

  // Record the failed transaction
  const { error: transactionError } = await supabase
    .from("billing_transactions")
    .upsert(
      {
        user_id: user.id,
        transaction_type: "payment_failed",
        amount: invoice.amount_due || 0,
        currency: invoice.currency || "usd",
        payment_provider: "stripe",
        external_transaction_id: invoiceId,
        status: "failed",
        metadata: {
          subscription_id: subscriptionId,
          attempt_count: invoice.attempt_count,
          event_id: eventId,
        },
      },
      {
        onConflict: "external_transaction_id",
        ignoreDuplicates: true,
      },
    );

  if (transactionError) {
    console.warn("[webhook] Failed to record failed transaction:", {
      error: transactionError.message,
    });
  }

  // Update subscription status if applicable
  if (subscriptionId) {
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        status: "past_due",
      })
      .eq("external_subscription_id", subscriptionId);

    if (updateError) {
      console.warn("[webhook] Failed to update subscription status:", {
        error: updateError.message,
      });
    }
  }

  console.log("[webhook] Payment failure recorded for user:", user.id);

  return {
    success: true,
    message: "Payment failure recorded",
    details: {
      userId: user.id,
      attemptCount: invoice.attempt_count,
    },
  };
}
