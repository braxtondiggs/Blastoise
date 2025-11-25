-- Migration: Enhance visits table for Google Timeline Import feature
-- Purpose: Add source tracking and import timestamp

-- Add source column to track visit origin
ALTER TABLE visits
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'auto_detect';

-- Add imported_at column to track when visit was imported (null for auto-detected visits)
ALTER TABLE visits
ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ;

-- Create index for source filtering
CREATE INDEX IF NOT EXISTS idx_visits_source ON visits(source);

-- Create index for import timestamp queries
CREATE INDEX IF NOT EXISTS idx_visits_imported_at ON visits(imported_at)
WHERE imported_at IS NOT NULL;

-- Update existing visits to have source='auto_detect' if null
UPDATE visits SET source = 'auto_detect' WHERE source IS NULL;

COMMENT ON COLUMN visits.source IS 'Visit origin: auto_detect, google_import, manual';
COMMENT ON COLUMN visits.imported_at IS 'Timestamp when visit was imported (null for auto-detected visits)';
