-- Compose Pipeline v2 metadata columns for generation_metrics
-- Adds pipeline version tracking and compose-specific metrics

ALTER TABLE generation_metrics
  ADD COLUMN IF NOT EXISTS pipeline_version TEXT DEFAULT 'v1',
  ADD COLUMN IF NOT EXISTS candidate_count INTEGER,
  ADD COLUMN IF NOT EXISTS resolved_count INTEGER,
  ADD COLUMN IF NOT EXISTS filtered_count INTEGER,
  ADD COLUMN IF NOT EXISTS place_resolve_enabled BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN generation_metrics.pipeline_version IS 'v1 = legacy outline+chunk, v2 = compose pipeline';
COMMENT ON COLUMN generation_metrics.candidate_count IS 'Number of semantic candidates generated (v2 only)';
COMMENT ON COLUMN generation_metrics.resolved_count IS 'Number of candidates resolved via Places API (v2 only)';
COMMENT ON COLUMN generation_metrics.filtered_count IS 'Number of candidates remaining after feasibility scoring (v2 only)';
COMMENT ON COLUMN generation_metrics.place_resolve_enabled IS 'Whether Places API resolution was enabled (v2 only)';
