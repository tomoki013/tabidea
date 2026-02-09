// src/lib/stripe/client.ts
import Stripe from "stripe";

// Provide a dummy key for build time if the environment variable is missing.
// This allows the build to pass even without the real key.
const stripeKey = process.env.STRIPE_SECRET_KEY || "dummy_key_for_build";

export const stripe = new Stripe(stripeKey, {
  apiVersion: "2026-01-28.clover", // 最新のAPI version
  typescript: true,
});
