export type BlogPostStatus = 'draft' | 'published';

export interface BlogProfile {
  user_id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_path: string | null;
}

export interface BlogPost {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content_html: string | null;
  content_json: Record<string, unknown> | null;
  status: BlogPostStatus;
  published_at: string | null;
  cover_image_path: string | null;
  updated_at: string;
}

export interface BlogEmbed {
  type: 'shiori';
  ref_slug: string;
  ref_token?: string | null;
}
