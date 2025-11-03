-- Migration: Create user_preferences table
-- Description: Stores user settings and privacy preferences

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  location_tracking_enabled BOOLEAN DEFAULT true,
  sharing_default VARCHAR(20) DEFAULT 'never' CHECK (sharing_default IN ('never', 'ask', 'always')),
  notification_settings JSONB DEFAULT '{
    "visit_detected": true,
    "visit_ended": false,
    "weekly_summary": true
  }'::jsonb,
  privacy_settings JSONB DEFAULT '{
    "timestamp_rounding_minutes": 15,
    "share_city_by_default": false,
    "allow_analytics": false
  }'::jsonb,
  map_settings JSONB DEFAULT '{
    "default_radius_km": 5,
    "show_breweries": true,
    "show_wineries": true,
    "cluster_markers": true
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own preferences
CREATE POLICY "Users can view own preferences"
  ON public.user_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can only insert their own preferences
CREATE POLICY "Users can create own preferences"
  ON public.user_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own preferences
CREATE POLICY "Users can update own preferences"
  ON public.user_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Update timestamp trigger
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create default preferences for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create preferences on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON TABLE public.user_preferences IS 'User settings and privacy preferences';
