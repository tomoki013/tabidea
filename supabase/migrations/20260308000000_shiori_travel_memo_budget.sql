-- Shiori travel memo & budget: add overall_budget to plan_publications,
-- update get_public_shiori to expose user_id and overall_budget

-- 1. Add overall_budget columns to plan_publications
ALTER TABLE public.plan_publications
  ADD COLUMN IF NOT EXISTS overall_budget NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS overall_budget_currency TEXT NOT NULL DEFAULT 'JPY';

-- 2. Recreate get_public_shiori to include user_id, overall_budget, overall_budget_currency
CREATE OR REPLACE FUNCTION public.get_public_shiori(p_slug TEXT, p_token TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_publication_id UUID;
  v_plan_id UUID;
  v_visibility TEXT;
  v_token TEXT;
  v_publish_journal BOOLEAN;
  v_publish_budget BOOLEAN;
  v_conditions_snapshot JSONB;
  v_overall_budget NUMERIC(12,2);
  v_overall_budget_currency TEXT;
  v_payload JSONB;
BEGIN
  SELECT id, plan_id, visibility, unlisted_token, publish_journal, publish_budget,
         conditions_snapshot, overall_budget, overall_budget_currency
    INTO v_publication_id, v_plan_id, v_visibility, v_token, v_publish_journal, v_publish_budget,
         v_conditions_snapshot, v_overall_budget, v_overall_budget_currency
  FROM public.plan_publications
  WHERE slug = p_slug;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_visibility = 'private' THEN
    RETURN NULL;
  END IF;

  IF v_visibility = 'unlisted' AND (p_token IS NULL OR p_token <> v_token) THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'plan', jsonb_build_object(
      'id', p.id,
      'user_id', p.user_id,
      'destination', p.destination,
      'duration_days', p.duration_days,
      'thumbnail_url', p.thumbnail_url,
      'share_code', p.share_code,
      'created_at', p.created_at,
      'updated_at', p.updated_at,
      'visibility', v_visibility,
      'publish_journal', v_publish_journal,
      'publish_budget', v_publish_budget,
      'conditions_snapshot', v_conditions_snapshot,
      'overall_budget', CASE WHEN v_publish_budget THEN v_overall_budget ELSE NULL END,
      'overall_budget_currency', COALESCE(v_overall_budget_currency, 'JPY'),
      'likes_count', (
        SELECT COUNT(*)::INT
        FROM public.shiori_likes sl
        WHERE sl.publication_id = v_publication_id
      ),
      'viewer_liked', CASE
        WHEN auth.uid() IS NULL THEN FALSE
        ELSE EXISTS (
          SELECT 1
          FROM public.shiori_likes sl
          WHERE sl.publication_id = v_publication_id
            AND sl.user_id = auth.uid()
        )
      END
    ),
    'days', COALESCE((
      SELECT jsonb_agg(day_payload ORDER BY day_number)
      FROM (
        SELECT d.day_number,
               jsonb_build_object(
                 'id', d.id,
                 'day_number', d.day_number,
                 'title', d.title,
                 'date_value', d.date_value,
                 'items', COALESCE((
                   SELECT jsonb_agg(jsonb_build_object(
                     'id', i.id,
                     'item_type', i.item_type,
                     'category', i.category,
                     'title', i.title,
                     'description', i.description,
                     'location', i.location,
                     'start_time', i.start_time,
                     'note', i.note,
                     'estimated_cost', CASE WHEN v_publish_budget THEN i.estimated_cost ELSE NULL END,
                     'actual_cost', CASE WHEN v_publish_budget THEN i.actual_cost ELSE NULL END,
                     'currency', i.actual_currency,
                     'bookings', COALESCE((
                       SELECT jsonb_agg(jsonb_build_object(
                         'booking_url', b.booking_url,
                         'booking_reference', b.booking_reference,
                         'provider', b.provider,
                         'status', b.status,
                         'memo', b.memo
                       ))
                       FROM public.item_bookings b
                       WHERE b.item_id = i.id
                     ), '[]'::jsonb),
                     'journal', CASE WHEN v_publish_journal THEN (
                       SELECT jsonb_build_object(
                         'id', j.id,
                         'content', j.content,
                         'updated_at', j.updated_at,
                         'phase', j.phase,
                         'place_name', COALESCE(j.place_name, i.location),
                         'photo_urls', COALESCE(to_jsonb(j.photo_urls), '[]'::jsonb),
                         'visibility', j.visibility
                       )
                       FROM public.journal_entries j
                       WHERE j.item_id = i.id
                         AND j.visibility = 'public'
                       ORDER BY j.updated_at DESC
                       LIMIT 1
                     ) ELSE NULL END
                   ) ORDER BY i.sort_order)
                   FROM public.plan_items i
                   WHERE i.day_id = d.id
                 ), '[]'::jsonb)
               ) AS day_payload
        FROM public.plan_days d
        WHERE d.plan_id = v_plan_id
      ) day_rows
    ), '[]'::jsonb)
  ) INTO v_payload
  FROM public.plans p
  WHERE p.id = v_plan_id;

  RETURN v_payload;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_shiori(TEXT, TEXT) TO anon, authenticated;
