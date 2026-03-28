-- Add pipeline_context column to generation_sessions
-- v4 パイプラインで homeBaseCity 等のコンテキストを保存するために必要

ALTER TABLE generation_sessions
  ADD COLUMN IF NOT EXISTS pipeline_context JSONB;
