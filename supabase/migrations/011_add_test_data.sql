-- Migration: Add test data with fake addresses and venue names
-- Purpose: Populate venues with realistic test data for development

-- Update existing venues with better names and add address/postal_code to metadata
UPDATE venues
SET
  name = CASE
    WHEN venue_type = 'brewery' THEN
      (ARRAY[
        'Hoppy Trails Brewing Co.',
        'Iron Horse Brewery',
        'Cascade Peak Brewing',
        'Timber & Grain Brewery',
        'Stone Bridge Brewing Company',
        'Mountain View Taphouse',
        'River City Brewing Co.',
        'Urban Hops Brewing',
        'Skyline Craft Brewery',
        'Harbor Lights Brewing'
      ])[FLOOR(RANDOM() * 10 + 1)]
    ELSE
      (ARRAY[
        'Sunset Ridge Winery',
        'Willow Creek Vineyards',
        'Golden Valley Estate',
        'Maple Grove Winery',
        'Cedar Hill Vineyards',
        'Riverside Winery',
        'Hilltop Estate Wines',
        'Meadow Brook Winery',
        'Autumn Harvest Vineyards',
        'Valley View Estate'
      ])[FLOOR(RANDOM() * 10 + 1)]
  END,
  metadata = jsonb_set(
    jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{address}',
      to_jsonb((FLOOR(RANDOM() * 9999 + 100))::TEXT || ' ' ||
        (ARRAY[
          'Main Street',
          'Oak Avenue',
          'Maple Drive',
          'Pine Road',
          'Cedar Lane',
          'Elm Street',
          'Broadway',
          'Park Avenue',
          'River Road',
          'Washington Street',
          'Industrial Way',
          'Commerce Drive',
          'Harbor Boulevard',
          'Market Street',
          'Summit Avenue'
        ])[FLOOR(RANDOM() * 15 + 1)]
      )
    ),
    '{postal_code}',
    to_jsonb(
      CASE
        WHEN state_province = 'OR' THEN
          (ARRAY['97201', '97202', '97210', '97212', '97214', '97215', '97232', '97266'])[FLOOR(RANDOM() * 8 + 1)]
        WHEN state_province = 'WA' THEN
          (ARRAY['98101', '98102', '98104', '98109', '98112', '98115', '98122', '98144'])[FLOOR(RANDOM() * 8 + 1)]
        WHEN state_province = 'CA' THEN
          (ARRAY['94102', '94103', '94104', '94110', '94114', '94117', '94133', '94158'])[FLOOR(RANDOM() * 8 + 1)]
        ELSE '00000'
      END
    )
  )
WHERE source = 'google_import' AND city IS NOT NULL;

-- Insert some additional test venues if there are fewer than 5
INSERT INTO venues (name, latitude, longitude, venue_type, source, city, state_province, country, metadata)
SELECT
  'Cascade Peak Brewing',
  45.5230,
  -122.6765,
  'brewery',
  'manual',
  'Portland',
  'OR',
  'US',
  jsonb_build_object(
    'address', '1234 NW 23rd Avenue',
    'postal_code', '97210',
    'phone', '(503) 555-0123',
    'website', 'https://cascadepeakbrewing.example.com',
    'hours', 'Mon-Thu 11am-10pm, Fri-Sat 11am-11pm, Sun 12pm-9pm'
  )
WHERE NOT EXISTS (
  SELECT 1 FROM venues WHERE name = 'Cascade Peak Brewing'
);

INSERT INTO venues (name, latitude, longitude, venue_type, source, city, state_province, country, metadata)
SELECT
  'Sunset Ridge Winery',
  45.5155,
  -122.6789,
  'winery',
  'manual',
  'Portland',
  'OR',
  'US',
  jsonb_build_object(
    'address', '5678 SE Hawthorne Boulevard',
    'postal_code', '97215',
    'phone', '(503) 555-0456',
    'website', 'https://sunsetridgewinery.example.com',
    'hours', 'Wed-Sun 12pm-8pm, Closed Mon-Tue'
  )
WHERE NOT EXISTS (
  SELECT 1 FROM venues WHERE name = 'Sunset Ridge Winery'
);

INSERT INTO venues (name, latitude, longitude, venue_type, source, city, state_province, country, metadata)
SELECT
  'Iron Horse Brewery',
  47.6062,
  -122.3321,
  'brewery',
  'manual',
  'Seattle',
  'WA',
  'US',
  jsonb_build_object(
    'address', '789 Pike Street',
    'postal_code', '98101',
    'phone', '(206) 555-0789',
    'website', 'https://ironhorsebrewery.example.com',
    'hours', 'Daily 11am-11pm'
  )
WHERE NOT EXISTS (
  SELECT 1 FROM venues WHERE name = 'Iron Horse Brewery'
);

-- Log the update
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count FROM venues WHERE metadata->>'address' IS NOT NULL;
  RAISE NOTICE 'Updated % venues with address data', updated_count;
END $$;
