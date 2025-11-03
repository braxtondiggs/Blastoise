-- Migration: Create visits table
-- Description: Stores user visit records with privacy-first design (no GPS coordinates)

CREATE TABLE IF NOT EXISTS public.visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  arrival_time TIMESTAMPTZ NOT NULL,
  departure_time TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_visits_user_id ON public.visits(user_id);
CREATE INDEX idx_visits_venue_id ON public.visits(venue_id);
CREATE INDEX idx_visits_arrival_time ON public.visits(arrival_time DESC);
CREATE INDEX idx_visits_is_active ON public.visits(is_active) WHERE is_active = true;
CREATE INDEX idx_visits_user_arrival ON public.visits(user_id, arrival_time DESC);

-- Unique constraint: User can only have one active visit at a time
CREATE UNIQUE INDEX idx_visits_user_active ON public.visits(user_id)
WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own visits
CREATE POLICY "Users can view own visits"
  ON public.visits
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can only insert their own visits
CREATE POLICY "Users can create own visits"
  ON public.visits
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own visits
CREATE POLICY "Users can update own visits"
  ON public.visits
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can only delete their own visits
CREATE POLICY "Users can delete own visits"
  ON public.visits
  FOR DELETE
  USING (auth.uid() = user_id);

-- Update timestamp trigger
CREATE TRIGGER update_visits_updated_at
  BEFORE UPDATE ON public.visits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Constraint: Departure time must be after arrival time
ALTER TABLE public.visits
ADD CONSTRAINT check_departure_after_arrival
CHECK (departure_time IS NULL OR departure_time > arrival_time);

COMMENT ON TABLE public.visits IS 'User visit records (privacy-first: no GPS coordinates stored)';
COMMENT ON COLUMN public.visits.arrival_time IS 'Rounded to 15-minute intervals for privacy';
COMMENT ON COLUMN public.visits.departure_time IS 'Rounded to 15-minute intervals for privacy';
COMMENT ON COLUMN public.visits.is_active IS 'Whether the visit is currently ongoing';
