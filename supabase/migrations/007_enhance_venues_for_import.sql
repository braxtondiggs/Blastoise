-- Migration: Enhance venues table for Google Timeline Import feature
-- Purpose: Add Google Place ID, source tracking, and verification tier tracking

-- Add google_place_id column for exact matching
ALTER TABLE venues
ADD COLUMN IF NOT EXISTS google_place_id VARCHAR(255) UNIQUE;

-- Add source column to track venue origin
ALTER TABLE venues
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';

-- Add verification_tier column to track how venue was verified during import
-- 1 = Tier 1 (keyword matching), 2 = Tier 2 (Open Brewery DB), 3 = Tier 3 (Google Search)
ALTER TABLE venues
ADD COLUMN IF NOT EXISTS verification_tier INTEGER CHECK (verification_tier IN (1, 2, 3));

-- Create index for Google Place ID lookups (exact matching during import)
CREATE INDEX IF NOT EXISTS idx_venues_google_place_id ON venues(google_place_id)
WHERE google_place_id IS NOT NULL;

-- Create index for source filtering
CREATE INDEX IF NOT EXISTS idx_venues_source ON venues(source);

-- Update existing venues to have source='manual' if null
UPDATE venues SET source = 'manual' WHERE source IS NULL;

COMMENT ON COLUMN venues.google_place_id IS 'Google Place ID from Timeline data for exact matching';
COMMENT ON COLUMN venues.source IS 'Venue origin: manual, google_import, user_created, auto_detect';
COMMENT ON COLUMN venues.verification_tier IS 'Import verification method: 1=keyword, 2=brewery_db, 3=google_search';
