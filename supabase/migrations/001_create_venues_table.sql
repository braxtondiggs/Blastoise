-- Migration: Create venues table
-- Description: Stores brewery and winery venue information

CREATE TABLE IF NOT EXISTS public.venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  city VARCHAR(100),
  state_province VARCHAR(100),
  country VARCHAR(100),
  venue_type VARCHAR(20) NOT NULL CHECK (venue_type IN ('brewery', 'winery')),
  source VARCHAR(20) NOT NULL CHECK (source IN ('osm', 'brewerydb', 'manual')),
  external_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_venues_type ON public.venues(venue_type);
CREATE INDEX idx_venues_source ON public.venues(source);
CREATE INDEX idx_venues_location ON public.venues(latitude, longitude);
CREATE INDEX idx_venues_external_id ON public.venues(external_id);

-- Unique constraint for external IDs per source
CREATE UNIQUE INDEX idx_venues_external_source ON public.venues(external_id, source)
WHERE external_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access to venues
CREATE POLICY "Venues are publicly readable"
  ON public.venues
  FOR SELECT
  USING (true);

-- Policy: Only authenticated users can insert venues (manual additions)
CREATE POLICY "Authenticated users can add venues"
  ON public.venues
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_venues_updated_at
  BEFORE UPDATE ON public.venues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.venues IS 'Brewery and winery venue information';
COMMENT ON COLUMN public.venues.source IS 'Data source: osm (OpenStreetMap), brewerydb (Open Brewery DB), manual (user-added)';
