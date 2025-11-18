-- Migration: Add metadata column to venues table
-- Purpose: Store rich Google Places API data (phone, website, hours, ratings, etc.)

-- Add metadata column as JSONB for flexible storage
ALTER TABLE venues
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create GIN index for fast JSONB queries
CREATE INDEX IF NOT EXISTS idx_venues_metadata_gin ON venues USING GIN (metadata);

-- Add specific indexes for commonly queried metadata fields
CREATE INDEX IF NOT EXISTS idx_venues_metadata_website
ON venues ((metadata->>'website'))
WHERE metadata->>'website' IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_venues_metadata_phone
ON venues ((metadata->>'phone'))
WHERE metadata->>'phone' IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_venues_metadata_business_status
ON venues ((metadata->>'business_status'))
WHERE metadata->>'business_status' IS NOT NULL;

COMMENT ON COLUMN venues.metadata IS 'Rich venue data from Google Places API: phone, website, hours, ratings, business_status, etc.';
