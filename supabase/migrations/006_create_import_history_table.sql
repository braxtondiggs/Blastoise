-- Migration: Create import_history table for Google Timeline Import feature
-- Purpose: Track all import operations with metadata and statistics

CREATE TABLE IF NOT EXISTS import_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source VARCHAR(50) NOT NULL DEFAULT 'google_timeline', -- 'google_timeline', future: 'apple_maps', etc.
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  file_name VARCHAR(255),
  job_id VARCHAR(255), -- BullMQ job ID for async imports
  total_places INTEGER NOT NULL DEFAULT 0,
  visits_created INTEGER NOT NULL DEFAULT 0,
  visits_skipped INTEGER NOT NULL DEFAULT 0,
  new_venues_created INTEGER NOT NULL DEFAULT 0,
  processing_time_ms INTEGER,
  metadata JSONB, -- Store summary, errors, tier statistics
  CONSTRAINT fk_import_history_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_import_history_user ON import_history(user_id);
CREATE INDEX idx_import_history_source ON import_history(source);
CREATE INDEX idx_import_history_job_id ON import_history(job_id) WHERE job_id IS NOT NULL;
CREATE INDEX idx_import_history_imported_at ON import_history(imported_at DESC);

-- Row-Level Security (RLS)
ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own import history
CREATE POLICY import_history_select_own
  ON import_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can only insert their own import records
CREATE POLICY import_history_insert_own
  ON import_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own import records (for job completion)
CREATE POLICY import_history_update_own
  ON import_history
  FOR UPDATE
  USING (auth.uid() = user_id);

COMMENT ON TABLE import_history IS 'Tracks Google Timeline import operations with metadata and statistics';
COMMENT ON COLUMN import_history.source IS 'Import source type: google_timeline, apple_maps, etc.';
COMMENT ON COLUMN import_history.job_id IS 'BullMQ job ID for async imports (>100 places)';
COMMENT ON COLUMN import_history.metadata IS 'JSON object with errors, tier statistics, and additional details';
