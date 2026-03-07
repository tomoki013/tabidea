-- Shiori conditions snapshot and fork support

-- 1-0. Add public SELECT policy for plan_publications (public visibility readable by anyone)
DROP POLICY IF EXISTS "plan_publications_public_select" ON public.plan_publications;
CREATE POLICY "plan_publications_public_select" ON public.plan_publications
  FOR SELECT USING (visibility = 'public');

-- 1-1. Add conditions_snapshot column to plan_publications
ALTER TABLE public.plan_publications
  ADD COLUMN IF NOT EXISTS conditions_snapshot JSONB;

-- 1-2. Update get_public_shiori RPC to include conditions_snapshot and thumbnail_url
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
  v_payload JSONB;
BEGIN
  SELECT id, plan_id, visibility, unlisted_token, publish_journal, publish_budget, conditions_snapshot
    INTO v_publication_id, v_plan_id, v_visibility, v_token, v_publish_journal, v_publish_budget, v_conditions_snapshot
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
      'thumbnail_url', p.thumbnail_url,
      'share_code', p.share_code,
      'created_at', p.created_at,
      'updated_at', p.updated_at,
      'visibility', v_visibility,
      'publish_journal', v_publish_journal,
      'publish_budget', v_publish_budget,
      'conditions_snapshot', v_conditions_snapshot,
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

-- 1-3. Create fork_public_shiori RPC
CREATE OR REPLACE FUNCTION public.fork_public_shiori(p_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_source_plan_id UUID;
  v_source_destination TEXT;
  v_source_duration_days INTEGER;
  v_source_thumbnail_url TEXT;
  v_new_plan_id UUID;
  v_new_slug TEXT;
  v_new_share_code TEXT;
  v_day RECORD;
  v_new_day_id UUID;
BEGIN
  -- 1. Check authentication
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;

  -- 2. Find source publication (must be public)
  SELECT plan_id
    INTO v_source_plan_id
  FROM public.plan_publications
  WHERE slug = p_slug AND visibility = 'public';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'shiori_not_found';
  END IF;

  -- Get source plan metadata
  SELECT destination, duration_days, thumbnail_url
    INTO v_source_destination, v_source_duration_days, v_source_thumbnail_url
  FROM public.plans
  WHERE id = v_source_plan_id;

  -- 3. Generate unique identifiers
  v_new_plan_id := extensions.gen_random_uuid();
  v_new_share_code := left(encode(extensions.gen_random_bytes(8), 'hex'), 10);
  v_new_slug := 'fork-' || left(encode(extensions.gen_random_bytes(5), 'hex'), 10);

  -- 4. Create new plan record (no encrypted data)
  INSERT INTO public.plans (
    id, user_id, share_code, destination, duration_days, thumbnail_url,
    encrypted_data, encryption_iv, key_version, is_public
  ) VALUES (
    v_new_plan_id, v_user_id, v_new_share_code,
    v_source_destination, v_source_duration_days, v_source_thumbnail_url,
    '""', '', 1, FALSE
  );

  -- 5 & 6. Copy plan_days (without date_value) and plan_items (with note=NULL)
  FOR v_day IN
    SELECT * FROM public.plan_days WHERE plan_id = v_source_plan_id ORDER BY day_number
  LOOP
    v_new_day_id := extensions.gen_random_uuid();

    INSERT INTO public.plan_days (id, plan_id, user_id, day_number, title, date_value)
    VALUES (v_new_day_id, v_new_plan_id, v_user_id, v_day.day_number, v_day.title, NULL);

    INSERT INTO public.plan_items (
      plan_id, day_id, user_id, item_type, category, sort_order,
      title, description, start_time, location,
      estimated_cost, estimated_currency, actual_cost, actual_currency,
      note, metadata
    )
    SELECT
      v_new_plan_id, v_new_day_id, v_user_id, item_type, category, sort_order,
      title, description, start_time, location,
      estimated_cost, estimated_currency, NULL, actual_currency,
      NULL, metadata
    FROM public.plan_items
    WHERE day_id = v_day.id
    ORDER BY sort_order;
  END LOOP;

  -- 7. Create private plan_publications record
  INSERT INTO public.plan_publications (
    plan_id, user_id, slug, visibility, publish_journal, publish_budget
  ) VALUES (
    v_new_plan_id, v_user_id, v_new_slug, 'private', TRUE, FALSE
  );

  -- 8. Return result
  RETURN jsonb_build_object(
    'new_plan_id', v_new_plan_id,
    'new_slug', v_new_slug
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fork_public_shiori(TEXT) TO authenticated;
