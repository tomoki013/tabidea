-- Normalize legacy yearly premium codes to monthly premium.
-- Application code no longer accepts `premium_yearly`.
UPDATE subscriptions
SET plan_code = 'premium_monthly',
    updated_at = NOW()
WHERE plan_code = 'premium_yearly';
