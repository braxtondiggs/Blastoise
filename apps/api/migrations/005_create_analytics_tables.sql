-- Migration: Create analytics tables
-- Description: Optional anonymized analytics (opt-in only)

CREATE TABLE IF NOT EXISTS public.visit_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_visits INTEGER DEFAULT 0,
  total_breweries INTEGER DEFAULT 0,
  total_wineries INTEGER DEFAULT 0,
  last_visit_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Indexes
CREATE INDEX idx_visit_stats_user_id ON public.visit_stats(user_id);

-- Enable Row Level Security
ALTER TABLE public.visit_stats ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own stats
CREATE POLICY "Users can view own stats"
  ON public.visit_stats
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can only update their own stats
CREATE POLICY "Users can update own stats"
  ON public.visit_stats
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Update timestamp trigger
CREATE TRIGGER update_visit_stats_updated_at
  BEFORE UPDATE ON public.visit_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update visit stats when visits are created
CREATE OR REPLACE FUNCTION public.update_visit_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.visit_stats (user_id, total_visits, last_visit_at)
  VALUES (
    NEW.user_id,
    1,
    NEW.arrival_time
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_visits = visit_stats.total_visits + 1,
    last_visit_at = GREATEST(visit_stats.last_visit_at, NEW.arrival_time),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update stats on visit insert
CREATE TRIGGER on_visit_created
  AFTER INSERT ON public.visits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_visit_stats();

COMMENT ON TABLE public.visit_stats IS 'Aggregated user visit statistics';
