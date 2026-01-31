-- Migration: Stripe Webhook Improvements
-- Date: 2026-01-31
-- Description: Add stripe_customer_id to users and add UNIQUE constraints for idempotency

-- ============================================
-- 1. Add stripe_customer_id to users table
-- ============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Create index for fast lookups by stripe_customer_id
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);

-- RLS policy to allow users to view their own stripe_customer_id
-- (The existing "Users can view own profile" policy already covers this)

-- ============================================
-- 2. Add UNIQUE constraint to subscriptions.external_subscription_id
-- ============================================
-- First, check and remove any duplicates (keep the most recent)
DELETE FROM subscriptions a
USING subscriptions b
WHERE a.id < b.id
  AND a.external_subscription_id = b.external_subscription_id
  AND a.external_subscription_id IS NOT NULL;

-- Add the UNIQUE constraint
ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_external_subscription_id_key;
ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_external_subscription_id_key
  UNIQUE (external_subscription_id);

-- ============================================
-- 3. Add UNIQUE constraint to billing_transactions.external_transaction_id
-- ============================================
-- First, check and remove any duplicates (keep the most recent)
DELETE FROM billing_transactions a
USING billing_transactions b
WHERE a.id < b.id
  AND a.external_transaction_id = b.external_transaction_id
  AND a.external_transaction_id IS NOT NULL;

-- Add the UNIQUE constraint
ALTER TABLE billing_transactions
  DROP CONSTRAINT IF EXISTS billing_transactions_external_transaction_id_key;
ALTER TABLE billing_transactions
  ADD CONSTRAINT billing_transactions_external_transaction_id_key
  UNIQUE (external_transaction_id);

-- ============================================
-- 4. Create RLS policies for webhook operations
-- ============================================
-- Allow service role to insert/update subscriptions (for webhooks)
-- Note: Service role key already bypasses RLS, but adding explicit policies for documentation

-- Policy for entitlement_grants insert (for webhooks)
DROP POLICY IF EXISTS "Service can insert grants" ON entitlement_grants;
CREATE POLICY "Service can insert grants"
  ON entitlement_grants FOR INSERT
  WITH CHECK (true);  -- Service role bypasses this anyway

-- Policy for subscriptions insert/update (for webhooks)
DROP POLICY IF EXISTS "Service can manage subscriptions" ON subscriptions;
CREATE POLICY "Service can manage subscriptions"
  ON subscriptions FOR ALL
  USING (true)
  WITH CHECK (true);  -- Service role bypasses this anyway

-- Policy for billing_transactions insert (for webhooks)
DROP POLICY IF EXISTS "Service can insert transactions" ON billing_transactions;
CREATE POLICY "Service can insert transactions"
  ON billing_transactions FOR INSERT
  WITH CHECK (true);  -- Service role bypasses this anyway

-- ============================================
-- 5. Add comment for documentation
-- ============================================
COMMENT ON COLUMN users.stripe_customer_id IS 'Stripe Customer ID linked to this user for payment processing';
COMMENT ON CONSTRAINT subscriptions_external_subscription_id_key ON subscriptions IS 'Ensures idempotency for webhook processing';
COMMENT ON CONSTRAINT billing_transactions_external_transaction_id_key ON billing_transactions IS 'Ensures idempotency for webhook processing';
