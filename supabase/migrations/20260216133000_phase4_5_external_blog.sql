-- Phase 4-5: external provider search + blog platform

-- ============
-- Phase 4
-- ============
CREATE TABLE IF NOT EXISTS external_search_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  item_id UUID REFERENCES plan_items(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  request_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS external_search_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES external_search_requests(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  result_json JSONB NOT NULL,
  normalized_fields JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plan_item_external_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES plan_items(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  external_id TEXT NOT NULL,
  deeplink TEXT,
  price_snapshot JSONB,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(item_id, provider, external_id)
);

CREATE INDEX IF NOT EXISTS idx_external_search_requests_user_plan ON external_search_requests(user_id, plan_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_external_search_requests_hash ON external_search_requests(request_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_external_search_results_request_id ON external_search_results(request_id);
CREATE INDEX IF NOT EXISTS idx_external_search_results_fetched_at ON external_search_results(fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_plan_item_external_selections_item_id ON plan_item_external_selections(item_id, created_at DESC);

ALTER TABLE external_search_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_search_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_item_external_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "external_search_requests_owner_crud" ON external_search_requests
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "external_search_results_owner_via_request" ON external_search_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM external_search_requests req
      WHERE req.id = request_id
        AND req.user_id = auth.uid()
    )
  );

CREATE POLICY "external_search_results_owner_insert" ON external_search_results
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM external_search_requests req
      WHERE req.id = request_id
        AND req.user_id = auth.uid()
    )
  );

CREATE POLICY "plan_item_external_selections_owner_crud" ON plan_item_external_selections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM plan_items i
      WHERE i.id = item_id
        AND i.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM plan_items i
      WHERE i.id = item_id
        AND i.user_id = auth.uid()
    )
  );

-- ============
-- Phase 5
-- ============
CREATE TABLE IF NOT EXISTS blog_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT,
  bio TEXT,
  avatar_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT blog_profiles_username_format CHECK (username ~ '^[a-zA-Z0-9_]{3,30}$')
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  excerpt TEXT,
  content_json JSONB,
  content_html TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMPTZ,
  cover_image_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, slug)
);

CREATE TABLE IF NOT EXISTS blog_post_embeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('shiori')),
  ref_slug TEXT NOT NULL,
  ref_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_user_status ON blog_posts(user_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(status, published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_post_embeds_post_id ON blog_post_embeds(post_id);

ALTER TABLE blog_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_embeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blog_profiles_owner_crud" ON blog_profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "blog_profiles_public_read" ON blog_profiles
  FOR SELECT USING (true);

CREATE POLICY "blog_posts_owner_crud" ON blog_posts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "blog_posts_published_public_read" ON blog_posts
  FOR SELECT USING (status = 'published');

CREATE POLICY "blog_post_embeds_owner_crud" ON blog_post_embeds
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM blog_posts p
      WHERE p.id = post_id
        AND p.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM blog_posts p
      WHERE p.id = post_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "blog_post_embeds_public_read_when_post_published" ON blog_post_embeds
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM blog_posts p
      WHERE p.id = post_id
        AND p.status = 'published'
    )
  );

CREATE OR REPLACE FUNCTION public.get_blog_post_by_username_slug(p_username TEXT, p_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post RECORD;
BEGIN
  SELECT
    p.id,
    p.title,
    p.slug,
    p.excerpt,
    p.content_html,
    p.cover_image_path,
    p.status,
    p.published_at,
    p.updated_at,
    bp.username,
    bp.display_name,
    bp.avatar_path
  INTO v_post
  FROM blog_posts p
  INNER JOIN blog_profiles bp ON bp.user_id = p.user_id
  WHERE bp.username = p_username
    AND p.slug = p_slug
    AND p.status = 'published'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', v_post.id,
    'title', v_post.title,
    'slug', v_post.slug,
    'excerpt', v_post.excerpt,
    'content_html', v_post.content_html,
    'cover_image_path', v_post.cover_image_path,
    'status', v_post.status,
    'published_at', v_post.published_at,
    'updated_at', v_post.updated_at,
    'author', jsonb_build_object(
      'username', v_post.username,
      'display_name', v_post.display_name,
      'avatar_path', v_post.avatar_path
    ),
    'embeds', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'type', e.type,
        'ref_slug', e.ref_slug,
        'ref_token', e.ref_token
      ))
      FROM blog_post_embeds e
      WHERE e.post_id = v_post.id
    ), '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_blog_post_by_username_slug(TEXT, TEXT) TO anon, authenticated;
