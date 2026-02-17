-- Enrich journal entries and add likes for public shiori pages.

ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS phase TEXT NOT NULL DEFAULT 'during' CHECK (phase IN ('before', 'during', 'after')),
  ADD COLUMN IF NOT EXISTS place_name TEXT,
  ADD COLUMN IF NOT EXISTS photo_urls TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('private', 'public'));

UPDATE public.journal_entries j
SET place_name = i.location
FROM public.plan_items i
WHERE j.item_id = i.id
  AND j.place_name IS NULL
  AND i.location IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_journal_entries_phase ON public.journal_entries(phase);

CREATE TABLE IF NOT EXISTS public.shiori_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id UUID NOT NULL REFERENCES public.plan_publications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (publication_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_shiori_likes_publication_id ON public.shiori_likes(publication_id);
CREATE INDEX IF NOT EXISTS idx_shiori_likes_user_id ON public.shiori_likes(user_id);

ALTER TABLE public.shiori_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shiori_likes_view_own" ON public.shiori_likes;
CREATE POLICY "shiori_likes_view_own" ON public.shiori_likes
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "shiori_likes_insert_own" ON public.shiori_likes;
CREATE POLICY "shiori_likes_insert_own" ON public.shiori_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "shiori_likes_delete_own" ON public.shiori_likes;
CREATE POLICY "shiori_likes_delete_own" ON public.shiori_likes
  FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_public_shiori(p_slug TEXT, p_token TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_publication_id UUID;
  v_plan_id UUID;
  v_visibility TEXT;
  v_token TEXT;
  v_publish_journal BOOLEAN;
  v_publish_budget BOOLEAN;
  v_payload JSONB;
BEGIN
  SELECT id, plan_id, visibility, unlisted_token, publish_journal, publish_budget
    INTO v_publication_id, v_plan_id, v_visibility, v_token, v_publish_journal, v_publish_budget
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
      'destination', p.destination,
      'duration_days', p.duration_days,
      'share_code', p.share_code,
      'created_at', p.created_at,
      'updated_at', p.updated_at,
      'visibility', v_visibility,
      'publish_journal', v_publish_journal,
      'publish_budget', v_publish_budget,
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
                     'estimated_cost', CASE WHEN v_publish_budget THEN i.estimated_cost ELSE NULL END,
                     'actual_cost', CASE WHEN v_publish_budget THEN i.actual_cost ELSE NULL END,
                     'currency', i.actual_currency,
                     'note', i.note,
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
