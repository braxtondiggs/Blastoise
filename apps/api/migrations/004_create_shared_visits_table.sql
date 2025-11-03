-- Migration: Create shared_visits table
-- Description: Stores anonymized visit sharing records

CREATE TABLE IF NOT EXISTS public.shared_visits (
  id VARCHAR(32) PRIMARY KEY, -- Random hex string
  visit_id UUID NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
  venue_name VARCHAR(255) NOT NULL,
  venue_city VARCHAR(100),
  visit_date DATE NOT NULL, -- Date only, no time for privacy
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_shared_visits_visit_id ON public.shared_visits(visit_id);
CREATE INDEX idx_shared_visits_expires_at ON public.shared_visits(expires_at)
WHERE expires_at IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.shared_visits ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read shared visits (public)
CREATE POLICY "Shared visits are publicly readable"
  ON public.shared_visits
  FOR SELECT
  USING (
    -- Allow if not expired
    (expires_at IS NULL OR expires_at > NOW())
  );

-- Policy: Users can only create shares for their own visits
CREATE POLICY "Users can create shares for own visits"
  ON public.shared_visits
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.visits
      WHERE visits.id = visit_id
      AND visits.user_id = auth.uid()
    )
  );

-- Policy: Users can only delete shares for their own visits
CREATE POLICY "Users can delete shares for own visits"
  ON public.shared_visits
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.visits
      WHERE visits.id = visit_id
      AND visits.user_id = auth.uid()
    )
  );

-- Function to auto-delete expired shares (run via cron or scheduled job)
CREATE OR REPLACE FUNCTION public.delete_expired_shares()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.shared_visits
  WHERE expires_at IS NOT NULL AND expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE public.shared_visits IS 'Anonymized visit sharing (no user identity, rounded dates)';
COMMENT ON COLUMN public.shared_visits.id IS 'Random 32-character hex string for share URLs';
COMMENT ON COLUMN public.shared_visits.visit_date IS 'Date only (no time) for privacy';
