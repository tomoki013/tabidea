-- Migration: Enforce unique Stripe customer mapping per user
-- Date: 2026-03-04
--
-- Purpose:
-- 1) Remove duplicated stripe_customer_id assignments across users
-- 2) Enforce uniqueness to prevent cross-account subscription mismatch

WITH ranked_customers AS (
  SELECT
    id,
    stripe_customer_id,
    ROW_NUMBER() OVER (
      PARTITION BY stripe_customer_id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS row_num
  FROM users
  WHERE stripe_customer_id IS NOT NULL
)
UPDATE users u
SET stripe_customer_id = NULL
FROM ranked_customers rc
WHERE u.id = rc.id
  AND rc.row_num > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_stripe_customer_id_unique
  ON users (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

COMMENT ON INDEX idx_users_stripe_customer_id_unique IS
  'Ensures a Stripe customer is linked to at most one app user';
