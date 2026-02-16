-- Phase 0-3 foundational schema for normalized itinerary, finance, journal, and shiori publication

CREATE TABLE IF NOT EXISTS plan_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  title TEXT,
  date_value DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (plan_id, day_number)
);

CREATE TABLE IF NOT EXISTS plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  day_id UUID NOT NULL REFERENCES plan_days(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('hotel', 'spot', 'transit', 'meal', 'other')),
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('lodging', 'transport', 'food', 'sightseeing', 'other')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  description TEXT,
  start_time TEXT,
  location TEXT,
  estimated_cost NUMERIC(12,2),
  estimated_currency TEXT NOT NULL DEFAULT 'JPY',
  actual_cost NUMERIC(12,2),
  actual_currency TEXT NOT NULL DEFAULT 'JPY',
  note TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS item_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES plan_items(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_url TEXT,
  booking_reference TEXT,
  provider TEXT,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'booked', 'cancelled')),
  memo TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES plan_items(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  last_edited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (item_id, user_id)
);

CREATE TABLE IF NOT EXISTS plan_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL UNIQUE REFERENCES plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'unlisted', 'public')),
  unlisted_token TEXT,
  publish_journal BOOLEAN NOT NULL DEFAULT TRUE,
  publish_budget BOOLEAN NOT NULL DEFAULT TRUE,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- performance-oriented indexes for RLS filters and joins
CREATE INDEX IF NOT EXISTS idx_plan_days_user_id ON plan_days(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_days_plan_id ON plan_days(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_items_user_id ON plan_items(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_items_plan_id ON plan_items(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_items_day_id_sort ON plan_items(day_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_item_bookings_user_id ON item_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_item_bookings_plan_id ON item_bookings(plan_id);
CREATE INDEX IF NOT EXISTS idx_item_bookings_item_id ON item_bookings(item_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_plan_id ON journal_entries(plan_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_item_id ON journal_entries(item_id);
CREATE INDEX IF NOT EXISTS idx_plan_publications_user_id ON plan_publications(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_publications_visibility ON plan_publications(visibility);
CREATE INDEX IF NOT EXISTS idx_plan_publications_slug ON plan_publications(slug);

ALTER TABLE plan_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_publications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plan_days_owner_crud" ON plan_days
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "plan_items_owner_crud" ON plan_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "item_bookings_owner_crud" ON item_bookings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "journal_entries_owner_crud" ON journal_entries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "plan_publications_owner_crud" ON plan_publications
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_public_shiori(p_slug TEXT, p_token TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan_id UUID;
  v_visibility TEXT;
  v_token TEXT;
  v_publish_journal BOOLEAN;
  v_publish_budget BOOLEAN;
  v_payload JSONB;
BEGIN
  SELECT plan_id, visibility, unlisted_token, publish_journal, publish_budget
    INTO v_plan_id, v_visibility, v_token, v_publish_journal, v_publish_budget
  FROM plan_publications
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
      'publish_budget', v_publish_budget
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
                       FROM item_bookings b
                       WHERE b.item_id = i.id
                     ), '[]'::jsonb),
                     'journal', CASE WHEN v_publish_journal THEN (
                       SELECT jsonb_build_object('content', j.content, 'updated_at', j.updated_at)
                       FROM journal_entries j
                       WHERE j.item_id = i.id
                     ) ELSE NULL END
                   ) ORDER BY i.sort_order)
                   FROM plan_items i
                   WHERE i.day_id = d.id
                 ), '[]'::jsonb)
               ) AS day_payload
        FROM plan_days d
        WHERE d.plan_id = v_plan_id
      ) day_rows
    ), '[]'::jsonb)
  ) INTO v_payload
  FROM plans p
  WHERE p.id = v_plan_id;

  RETURN v_payload;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_shiori(TEXT, TEXT) TO anon, authenticated;
