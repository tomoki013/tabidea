// src/lib/stripe/client.ts
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover", // 最新のAPI version
  typescript: true,
});
