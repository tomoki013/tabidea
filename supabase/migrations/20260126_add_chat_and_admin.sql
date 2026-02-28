-- ============================================
-- Migration: Add Chat Messages
-- Date: 2026-01-26
-- Admin management is handled via ADMIN_EMAILS environment variable.
-- ============================================

-- ============================================
-- 1. PLAN_CHAT_MESSAGES TABLE
-- Stores chat conversation history for each plan
-- ============================================
CREATE TABLE IF NOT EXISTS plan_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,

  -- Message content
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,

  -- Ordering
  sequence_number INTEGER NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique sequence per plan
  UNIQUE(plan_id, sequence_number)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_chat_messages_plan ON plan_chat_messages(plan_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_plan_seq ON plan_chat_messages(plan_id, sequence_number);

-- ============================================
-- RLS Policies for plan_chat_messages
-- ============================================
ALTER TABLE plan_chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can view chat messages for plans they own
CREATE POLICY "Users can view chat messages for own plans"
  ON plan_chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM plans
      WHERE plans.id = plan_chat_messages.plan_id
        AND plans.user_id = auth.uid()
    )
  );

-- Users can insert chat messages for plans they own
CREATE POLICY "Users can insert chat messages for own plans"
  ON plan_chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM plans
      WHERE plans.id = plan_chat_messages.plan_id
        AND plans.user_id = auth.uid()
    )
  );

-- Users can delete chat messages for plans they own
CREATE POLICY "Users can delete chat messages for own plans"
  ON plan_chat_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM plans
      WHERE plans.id = plan_chat_messages.plan_id
        AND plans.user_id = auth.uid()
    )
  );

-- ============================================
-- 3. Helper function to get chat history for a plan
-- ============================================
CREATE OR REPLACE FUNCTION get_plan_chat_history(p_plan_id UUID)
RETURNS TABLE (
  id UUID,
  role TEXT,
  content TEXT,
  sequence_number INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pcm.id,
    pcm.role,
    pcm.content,
    pcm.sequence_number,
    pcm.created_at
  FROM plan_chat_messages pcm
  WHERE pcm.plan_id = p_plan_id
  ORDER BY pcm.sequence_number ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. Function to save chat messages (batch insert)
-- ============================================
CREATE OR REPLACE FUNCTION save_plan_chat_messages(
  p_plan_id UUID,
  p_messages JSONB
)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_message JSONB;
  v_seq INTEGER := 0;
BEGIN
  -- Verify ownership
  SELECT user_id INTO v_user_id
  FROM plans
  WHERE id = p_plan_id;

  IF v_user_id IS NULL OR v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: not the owner of this plan';
  END IF;

  -- Delete existing messages for this plan
  DELETE FROM plan_chat_messages WHERE plan_id = p_plan_id;

  -- Insert new messages
  FOR v_message IN SELECT * FROM jsonb_array_elements(p_messages)
  LOOP
    v_seq := v_seq + 1;
    INSERT INTO plan_chat_messages (plan_id, role, content, sequence_number)
    VALUES (
      p_plan_id,
      v_message->>'role',
      v_message->>'content',
      v_seq
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin management is handled via ADMIN_EMAILS environment variable.
-- No database-level admin column or functions needed.
