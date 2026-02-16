-- Phase 4-5: External provider search + blog platform

-- ============================================
-- External provider search cache & selections
-- ============================================
CREATE TABLE IF NOT EXISTS external_search_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  item_id UUID REFERENCES plan_items(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  request_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS external_search_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES external_search_requests(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  result_json JSONB NOT NULL,
  normalized_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plan_item_external_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES plan_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  external_id TEXT NOT NULL,
  deeplink TEXT,
  price_snapshot JSONB,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (item_id, provider, external_id)
);

CREATE INDEX IF NOT EXISTS idx_external_search_requests_user_plan
  ON external_search_requests(user_id, plan_id, provider, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_external_search_requests_hash
  ON external_search_requests(provider, request_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_external_search_results_request_id
  ON external_search_results(request_id, fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_plan_item_external_sel_item
  ON plan_item_external_selections(item_id, created_at DESC);

ALTER TABLE external_search_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_search_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_item_external_selections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "external_search_requests_owner_crud" ON external_search_requests;
CREATE POLICY "external_search_requests_owner_crud"
  ON external_search_requests FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "external_search_results_owner_read" ON external_search_results;
CREATE POLICY "external_search_results_owner_read"
  ON external_search_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM external_search_requests r
      WHERE r.id = external_search_results.request_id
        AND r.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "external_search_results_owner_insert" ON external_search_results;
CREATE POLICY "external_search_results_owner_insert"
  ON external_search_results FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM external_search_requests r
      WHERE r.id = external_search_results.request_id
        AND r.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "plan_item_external_selections_owner_crud" ON plan_item_external_selections;
CREATE POLICY "plan_item_external_selections_owner_crud"
  ON plan_item_external_selections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Blog
-- ============================================
CREATE TABLE IF NOT EXISTS blog_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  avatar_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT blog_profiles_username_format CHECK (username ~ '^[a-z0-9_]{3,30}$')
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  excerpt TEXT,
  content_json JSONB,
  content_html TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  published_at TIMESTAMPTZ,
  cover_image_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, slug)
);

CREATE TABLE IF NOT EXISTS blog_post_embeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('shiori')),
  ref_slug TEXT NOT NULL,
  ref_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_status_published
  ON blog_posts(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_user_status
  ON blog_posts(user_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_post_embeds_post
  ON blog_post_embeds(post_id, type);

ALTER TABLE blog_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_embeds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blog_profiles_owner_crud" ON blog_profiles;
CREATE POLICY "blog_profiles_owner_crud"
  ON blog_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "blog_profiles_public_read" ON blog_profiles;
CREATE POLICY "blog_profiles_public_read"
  ON blog_profiles FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "blog_posts_owner_crud" ON blog_posts;
CREATE POLICY "blog_posts_owner_crud"
  ON blog_posts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "blog_posts_published_read" ON blog_posts;
CREATE POLICY "blog_posts_published_read"
  ON blog_posts FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "blog_post_embeds_owner_crud" ON blog_post_embeds;
CREATE POLICY "blog_post_embeds_owner_crud"
  ON blog_post_embeds FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts p
      WHERE p.id = blog_post_embeds.post_id
      AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM blog_posts p
      WHERE p.id = blog_post_embeds.post_id
      AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "blog_post_embeds_post_visibility_read" ON blog_post_embeds;
CREATE POLICY "blog_post_embeds_post_visibility_read"
  ON blog_post_embeds FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM blog_posts p
      WHERE p.id = blog_post_embeds.post_id
        AND (p.status = 'published' OR p.user_id = auth.uid())
    )
  );

-- Resolve published post via @username + slug
CREATE OR REPLACE FUNCTION public.get_published_blog_post(
  p_username TEXT,
  p_slug TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_post RECORD;
BEGIN
  SELECT p.id, p.title, p.slug, p.excerpt, p.content_json, p.content_html, p.cover_image_path,
         p.published_at, bp.username, bp.display_name,
         COALESCE((
           SELECT jsonb_agg(jsonb_build_object(
             'type', e.type,
             'ref_slug', e.ref_slug,
             'ref_token', e.ref_token
           ))
           FROM blog_post_embeds e
           WHERE e.post_id = p.id
         ), '[]'::jsonb) AS embeds
  INTO v_post
  FROM blog_posts p
  JOIN blog_profiles bp ON bp.user_id = p.user_id
  WHERE bp.username = p_username
    AND p.slug = p_slug
    AND p.status = 'published'
  LIMIT 1;

  IF v_post IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', v_post.id,
    'title', v_post.title,
    'slug', v_post.slug,
    'excerpt', v_post.excerpt,
    'content_json', v_post.content_json,
    'content_html', v_post.content_html,
    'cover_image_path', v_post.cover_image_path,
    'published_at', v_post.published_at,
    'author', jsonb_build_object(
      'username', v_post.username,
      'display_name', v_post.display_name
    ),
    'embeds', v_post.embeds
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_published_blog_post(TEXT, TEXT) TO anon, authenticated;

-- Storage bucket for blog cover images
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-images', 'blog-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "blog images upload own" ON storage.objects;
CREATE POLICY "blog images upload own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'blog-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "blog images update own" ON storage.objects;
CREATE POLICY "blog images update own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'blog-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "blog images delete own" ON storage.objects;
CREATE POLICY "blog images delete own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'blog-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "blog images public read" ON storage.objects;
CREATE POLICY "blog images public read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'blog-images');
