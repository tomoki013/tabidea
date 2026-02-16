-- Keep legacy plans.is_public and plan_publications visibility in sync

CREATE OR REPLACE FUNCTION public.sync_plan_publication_from_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_slug_base TEXT;
  v_slug TEXT;
BEGIN
  IF NEW.is_public THEN
    v_slug_base := regexp_replace(lower(coalesce(NEW.destination, 'trip')), '[^a-z0-9]+', '-', 'g');
    v_slug_base := regexp_replace(v_slug_base, '(^-|-$)', '', 'g');
    v_slug := left(coalesce(NULLIF(v_slug_base, ''), 'trip'), 48) || '-' || substring(NEW.id::text from 1 for 8);

    INSERT INTO public.plan_publications (
      plan_id,
      user_id,
      slug,
      visibility,
      publish_journal,
      publish_budget,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.user_id,
      v_slug,
      'public',
      true,
      true,
      now(),
      now()
    )
    ON CONFLICT (plan_id)
    DO UPDATE SET
      user_id = EXCLUDED.user_id,
      visibility = 'public',
      updated_at = now();
  ELSE
    UPDATE public.plan_publications
    SET visibility = 'private',
        updated_at = now()
    WHERE plan_id = NEW.id
      AND visibility = 'public';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_plan_publication_from_plan ON public.plans;
CREATE TRIGGER trg_sync_plan_publication_from_plan
AFTER INSERT OR UPDATE OF is_public, destination, user_id ON public.plans
FOR EACH ROW
EXECUTE FUNCTION public.sync_plan_publication_from_plan();

-- Backfill: public plans should always have a publication row with public visibility.
INSERT INTO public.plan_publications (
  plan_id,
  user_id,
  slug,
  visibility,
  publish_journal,
  publish_budget,
  created_at,
  updated_at
)
SELECT
  p.id,
  p.user_id,
  left(
    coalesce(
      nullif(
        regexp_replace(
          regexp_replace(lower(coalesce(p.destination, 'trip')), '[^a-z0-9]+', '-', 'g'),
          '(^-|-$)',
          '',
          'g'
        ),
        ''
      ),
      'trip'
    ),
    48
  ) || '-' || substring(p.id::text from 1 for 8),
  'public',
  true,
  true,
  now(),
  now()
FROM public.plans p
WHERE p.is_public = true
ON CONFLICT (plan_id)
DO UPDATE SET
  user_id = EXCLUDED.user_id,
  visibility = 'public',
  updated_at = now();
