-- Phase 4-5: external provider search + blog platform

-- =========================
-- Phase 4: External search
-- =========================
CREATE TABLE IF NOT EXISTS external_search_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
  item_id UUID REFERENCES plan_items(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  request_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(user_id, provider, request_hash)
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

CREATE INDEX IF NOT EXISTS idx_external_search_requests_user_provider_hash
  ON external_search_requests(user_id, provider, request_hash);
CREATE INDEX IF NOT EXISTS idx_external_search_requests_expires_at
  ON external_search_requests(expires_at);
CREATE INDEX IF NOT EXISTS idx_external_search_results_request_id
  ON external_search_results(request_id);
CREATE INDEX IF NOT EXISTS idx_plan_item_external_selections_item_id
  ON plan_item_external_selections(item_id);

ALTER TABLE external_search_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_search_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_item_external_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "external_search_requests_owner_crud" ON external_search_requests
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "external_search_results_owner_read" ON external_search_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM external_search_requests r
      WHERE r.id = external_search_results.request_id
      AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "external_search_results_owner_insert" ON external_search_results
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM external_search_requests r
      WHERE r.id = external_search_results.request_id
      AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "plan_item_external_selections_owner_crud" ON plan_item_external_selections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM plan_items i
      WHERE i.id = plan_item_external_selections.item_id
      AND i.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM plan_items i
      WHERE i.id = plan_item_external_selections.item_id
      AND i.user_id = auth.uid()
    )
  );

-- =========================
-- Phase 5: Blog platform
-- =========================
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
  content_html TEXT NOT NULL,
  content_json JSONB,
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

CREATE INDEX IF NOT EXISTS idx_blog_posts_status_published_at
  ON blog_posts(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_user_slug
  ON blog_posts(user_id, slug);
CREATE INDEX IF NOT EXISTS idx_blog_post_embeds_post_id
  ON blog_post_embeds(post_id);

ALTER TABLE blog_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_embeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blog_profiles_owner_crud" ON blog_profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "blog_profiles_public_read" ON blog_profiles
  FOR SELECT USING (true);

CREATE POLICY "blog_posts_owner_crud" ON blog_posts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "blog_posts_published_read" ON blog_posts
  FOR SELECT USING (status = 'published');

CREATE POLICY "blog_post_embeds_owner_crud" ON blog_post_embeds
  FOR ALL USING (
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

CREATE POLICY "blog_post_embeds_published_read" ON blog_post_embeds
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM blog_posts p
      WHERE p.id = blog_post_embeds.post_id
      AND p.status = 'published'
    )
  );

INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-images', 'blog-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "blog_images_owner_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'blog-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "blog_images_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'blog-images' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'blog-images' AND owner = auth.uid());

CREATE POLICY "blog_images_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'blog-images' AND owner = auth.uid());

CREATE POLICY "blog_images_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'blog-images');
