-- Migration: Fix visit source values from 'google_timeline' to 'google_import'
-- Purpose: Update existing visits that have 'google_timeline' to use 'google_import'
-- This aligns with the TypeScript VisitSource type definition

-- Update all visits with 'google_timeline' source to 'google_import'
UPDATE visits
SET source = 'google_import'
WHERE source = 'google_timeline';

-- Verify the update
-- SELECT source, COUNT(*) FROM visits GROUP BY source;
