-- Phase 1 itinerary-centric persistence
-- trips: trip aggregate head
-- trip_versions: append-only itinerary history

CREATE TABLE IF NOT EXISTS trips (
  trip_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  thread_id UUID,
  current_version INTEGER NOT NULL DEFAULT 0,
  title TEXT,
  destination_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  trip_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (trip_status IN ('draft', 'active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trip_versions (
  trip_id UUID NOT NULL REFERENCES trips(trip_id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  created_by TEXT NOT NULL
    CHECK (created_by IN ('agent', 'user', 'system')),
  created_from_run_id TEXT,
  base_version INTEGER,
  change_type TEXT NOT NULL DEFAULT 'create'
    CHECK (change_type IN ('create', 'patch', 'replan', 'fallback')),
  itinerary_json JSONB NOT NULL,
  summary_json JSONB,
  diff_from_base JSONB,
  completion_level TEXT,
  verification_summary JSONB,
  generated_under_constraints JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (trip_id, version)
);

CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(trip_status);
CREATE INDEX IF NOT EXISTS idx_trips_updated_at ON trips(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_trip_versions_created_at ON trip_versions(created_at DESC);

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_versions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'trips'
      AND policyname = 'service_role_trips'
  ) THEN
    CREATE POLICY "service_role_trips"
      ON trips
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'trip_versions'
      AND policyname = 'service_role_trip_versions'
  ) THEN
    CREATE POLICY "service_role_trip_versions"
      ON trip_versions
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'trips'
      AND policyname = 'users_read_own_trips'
  ) THEN
    CREATE POLICY "users_read_own_trips"
      ON trips
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'trip_versions'
      AND policyname = 'users_read_own_trip_versions'
  ) THEN
    CREATE POLICY "users_read_own_trip_versions"
      ON trip_versions
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM trips
          WHERE trips.trip_id = trip_versions.trip_id
            AND trips.user_id = auth.uid()
        )
      );
  END IF;
END $$;
