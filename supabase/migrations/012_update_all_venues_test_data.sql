-- Migration: Update all existing venues with better test data
-- Purpose: Give all venues nice names and fake addresses for development

-- Update all venues with better names, cities, states, and addresses
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
        'Harbor Lights Brewing',
        'Pacific Coast Brewing',
        'Wild Mountain Brewery',
        'Copper Creek Brewing',
        'Summit Ale House',
        'Riverside Brewery'
      ])[FLOOR(RANDOM() * 15 + 1)]
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
        'Valley View Estate',
        'Mountain Crest Winery',
        'Silver Lake Vineyards',
        'Heritage Hills Winery',
        'Crystal Springs Estate',
        'Oak Barrel Vineyards'
      ])[FLOOR(RANDOM() * 15 + 1)]
  END,
  city = COALESCE(city,
    (ARRAY['Portland', 'Seattle', 'Bend', 'Eugene', 'Salem', 'Tacoma', 'Vancouver', 'Beaverton'])[FLOOR(RANDOM() * 8 + 1)]
  ),
  state_province = COALESCE(state_province,
    CASE
      WHEN RANDOM() < 0.7 THEN 'OR'
      WHEN RANDOM() < 0.9 THEN 'WA'
      ELSE 'CA'
    END
  ),
  country = COALESCE(country, 'US'),
  metadata = jsonb_set(
    jsonb_set(
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
            'Summit Avenue',
            'NW 23rd Avenue',
            'SE Hawthorne Boulevard',
            'SW Morrison Street',
            'NE Fremont Street',
            'Division Street'
          ])[FLOOR(RANDOM() * 20 + 1)]
        )
      ),
      '{postal_code}',
      to_jsonb(
        CASE
          WHEN COALESCE(state_province, 'OR') = 'OR' THEN
            (ARRAY['97201', '97202', '97210', '97212', '97214', '97215', '97232', '97266'])[FLOOR(RANDOM() * 8 + 1)]
          WHEN COALESCE(state_province, 'WA') = 'WA' THEN
            (ARRAY['98101', '98102', '98104', '98109', '98112', '98115', '98122', '98144'])[FLOOR(RANDOM() * 8 + 1)]
          ELSE
            (ARRAY['94102', '94103', '94104', '94110', '94114', '94117', '94133', '94158'])[FLOOR(RANDOM() * 8 + 1)]
        END
      )
    ),
    '{phone}',
    to_jsonb(
      '(' || (FLOOR(RANDOM() * 900 + 200))::TEXT || ') 555-' ||
      LPAD((FLOOR(RANDOM() * 10000))::TEXT, 4, '0')
    )
  )
WHERE source = 'google_import' OR name LIKE 'Unknown%';

-- Log the update
DO $$
DECLARE
  updated_count INTEGER;
  venues_with_address INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count FROM venues WHERE name NOT LIKE 'Unknown%';
  SELECT COUNT(*) INTO venues_with_address FROM venues WHERE metadata->>'address' IS NOT NULL;
  RAISE NOTICE 'Updated % venues total, % now have addresses', updated_count, venues_with_address;
END $$;
