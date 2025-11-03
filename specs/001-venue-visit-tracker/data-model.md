# Data Model: Venue Visit Tracker

**Phase**: 1 - Design
**Date**: 2025-10-28
**Purpose**: Define entities, relationships, and validation rules

## Entity Definitions

### 1. User

Represents an authenticated user of the application.

**Attributes**:
- `id` (UUID, PK): Unique identifier, maps to Supabase auth.uid()
- `email` (string, unique, not null): User's email address
- `created_at` (timestamp, not null): Account creation timestamp
- `updated_at` (timestamp, not null): Last profile update timestamp
- `preferences` (JSON, nullable): User preferences object (see UserPreferences below)

**Relationships**:
- One user → Many visits (1:N)

**Validation Rules**:
- Email must be valid format (validated by Supabase Auth)
- Preferences JSON must conform to UserPreferences schema

**Storage**: Supabase `auth.users` table (managed by Supabase Auth)

**Privacy Notes**:
- No PII beyond email (required for authentication)
- Users can delete account and all associated data via API

---

### 2. UserPreferences

Embedded JSON object within User entity for settings and privacy controls.

**Attributes**:
- `location_tracking_enabled` (boolean, default: false): Master toggle for visit detection
- `sharing_default` (enum: "never" | "ask" | "always", default: "ask"): Default sharing behavior
- `notification_settings` (object):
  - `visit_detected` (boolean, default: true): Notify on visit detection
  - `new_venues_nearby` (boolean, default: false): Notify about new venues
- `privacy_settings` (object):
  - `store_visit_history` (boolean, default: true): Enable cloud sync
  - `anonymous_mode` (boolean, default: false): Local-only mode, no server sync
- `map_settings` (object):
  - `default_radius_km` (number, default: 5, min: 1, max: 50): Default proximity search radius
  - `cluster_markers` (boolean, default: true): Enable map clustering

**Validation Rules**:
- `default_radius_km` must be between 1 and 50
- All boolean fields default to stated values if not provided
- Enum fields validated against allowed values

**Storage**: Stored as JSON column in `users` table or separate `user_preferences` table

---

### 3. Venue

Represents a brewery or winery location.

**Attributes**:
- `id` (UUID, PK): Unique identifier
- `name` (string, not null, max 200 chars): Venue name
- `address` (string, nullable, max 500 chars): Street address
- `city` (string, nullable, max 100 chars): City name
- `state` (string, nullable, max 50 chars): State/province
- `country` (string, nullable, max 50 chars): Country code (ISO 3166-1 alpha-2)
- `postal_code` (string, nullable, max 20 chars): Postal/ZIP code
- `latitude` (decimal, not null, range: -90 to 90): Latitude coordinate (WGS84)
- `longitude` (decimal, not null, range: -180 to 180): Longitude coordinate (WGS84)
- `venue_type` (enum: "brewery" | "winery", not null): Venue category
- `source` (enum: "osm" | "brewerydb" | "manual", not null): Data source
- `source_id` (string, nullable): External ID from data source
- `metadata` (JSON, nullable): Additional info (website, phone, hours, etc.)
- `created_at` (timestamp, not null): Record creation timestamp
- `updated_at` (timestamp, not null): Last update timestamp

**Relationships**:
- One venue → Many visits (1:N)
- One venue → One geofence (1:1, implicit via lat/lng)

**Validation Rules**:
- Name is required and trimmed of whitespace
- Latitude/longitude required for geofence generation
- At least one of (address, city) must be present for display
- Source ID required if source is "osm" or "brewerydb"

**Indexes**:
- Index on (latitude, longitude) for spatial queries (PostGIS)
- Index on name for text search
- Index on venue_type for filtering

**Storage**: Postgres `venues` table + Redis geospatial index

**Privacy Notes**:
- Venue data is public (sourced from open datasets)
- No user-specific data attached to venue records

---

### 4. Visit

Represents a single visit to a venue by a user.

**Attributes**:
- `id` (UUID, PK): Unique identifier
- `user_id` (UUID, FK → User.id, not null): User who made the visit
- `venue_id` (UUID, FK → Venue.id, not null): Visited venue
- `arrival_time` (timestamp, not null): Rounded arrival timestamp (nearest 15 min)
- `departure_time` (timestamp, nullable): Rounded departure timestamp (nearest 15 min)
- `duration_minutes` (integer, nullable, computed): Calculated from arrival - departure
- `is_active` (boolean, not null, default: true): True if visit is in progress
- `detection_method` (enum: "auto" | "manual", not null, default: "auto"): How visit was created
- `synced` (boolean, not null, default: false): True if synced to server (client-side only)
- `created_at` (timestamp, not null): Record creation timestamp
- `updated_at` (timestamp, not null): Last update timestamp

**Relationships**:
- Many visits → One user (N:1)
- Many visits → One venue (N:1)
- One visit → One shared visit (1:1, optional)

**Validation Rules**:
- Arrival time required, rounded to nearest 15 minutes
- Departure time must be after arrival time if present
- Duration calculated automatically: `EXTRACT(EPOCH FROM (departure_time - arrival_time)) / 60`
- Active visits have `is_active = true` and `departure_time = null`
- Completed visits have `is_active = false` and `departure_time != null`

**Indexes**:
- Index on (user_id, arrival_time DESC) for timeline queries
- Index on venue_id for venue history queries
- Index on is_active for active visit lookups

**Storage**: Postgres `visits` table (server), IndexedDB `visits` store (client)

**Row-Level Security (RLS)**:
```sql
CREATE POLICY user_visits ON visits
  FOR ALL USING (auth.uid() = user_id);
```

**Privacy Notes**:
- No GPS coordinates stored, only venue reference
- Timestamps rounded to 15-minute intervals to prevent timing attacks
- Users can delete individual visits or entire history

---

### 5. SharedVisit

Represents an anonymized visit shared publicly or with friends.

**Attributes**:
- `id` (UUID, PK): Unique identifier (public share link)
- `visit_id` (UUID, FK → Visit.id, not null, unique): Original visit reference
- `venue_name` (string, not null): Venue name (denormalized for privacy)
- `venue_city` (string, nullable): City name (denormalized)
- `visit_date` (date, not null): Date only (no time) to anonymize
- `shared_at` (timestamp, not null): When the share was created
- `expires_at` (timestamp, nullable): Optional expiration for temporary shares
- `view_count` (integer, not null, default: 0): Number of times viewed

**Relationships**:
- Many shared visits → One visit (N:1)

**Validation Rules**:
- Visit date derived from visit arrival_time (date part only)
- Expiration time must be after shared_at if present
- Venue name/city copied from Venue at share time (not live references)

**Indexes**:
- Index on id for public access via share link
- Index on visit_id for reverse lookup
- Index on expires_at for cleanup jobs

**Storage**: Postgres `shared_visits` table

**Privacy Notes**:
- No user ID or precise timestamp exposed
- No coordinates or full address exposed
- Share links use UUID (not sequential IDs) to prevent enumeration
- Expired shares automatically hidden from public queries

---

### 6. Geofence (Client-Side Only)

Logical entity representing a circular boundary around a venue for detection. Not stored in database; generated on-demand from Venue coordinates.

**Attributes**:
- `venue_id` (UUID): Reference to venue
- `center_lat` (decimal): Center latitude
- `center_lng` (decimal): Center longitude
- `radius_meters` (integer, default: 100): Geofence radius

**Validation Rules**:
- Radius between 50 and 500 meters
- Adjusted dynamically based on venue type and urban density

**Storage**: None (ephemeral, computed from venue data)

**Privacy Notes**:
- Geofence matching performed entirely on-device
- No geofence crossings transmitted to server

---

## Entity Relationship Diagram

```text
┌──────────────┐
│     User     │
│              │
│ - id (PK)    │
│ - email      │
│ - preferences│
└──────┬───────┘
       │
       │ 1:N
       │
       ▼
┌──────────────┐         ┌──────────────┐
│    Visit     │ N:1     │    Venue     │
│              ├────────▶│              │
│ - id (PK)    │         │ - id (PK)    │
│ - user_id(FK)│         │ - name       │
│ - venue_id   │         │ - lat/lng    │
│ - arrival    │         │ - type       │
│ - departure  │         └──────────────┘
│ - is_active  │
└──────┬───────┘
       │
       │ 1:1 (optional)
       │
       ▼
┌──────────────┐
│ SharedVisit  │
│              │
│ - id (PK)    │
│ - visit_id   │
│ - venue_name │
│ - visit_date │
└──────────────┘
```

---

## State Transitions

### Visit Lifecycle

```text
[User arrives at venue]
         │
         ▼
    [is_active = true]
    [departure_time = null]
         │
         │ (user leaves venue)
         ▼
    [is_active = false]
    [departure_time = <rounded_time>]
    [duration_minutes = calculated]
         │
         │ (optional)
         ▼
    [SharedVisit created]
```

### Sync States

```text
[Visit created locally]
    [synced = false]
         │
         │ (network available)
         ▼
    POST /visits
         │
         ▼
    [synced = true]
```

---

## Database Schema (Postgres)

```sql
-- Users table (Supabase Auth manages this)
-- Reference only, actual schema in auth.users

-- User preferences (optional separate table)
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  location_tracking_enabled BOOLEAN NOT NULL DEFAULT false,
  sharing_default VARCHAR(10) NOT NULL DEFAULT 'ask',
  notification_settings JSONB NOT NULL DEFAULT '{}',
  privacy_settings JSONB NOT NULL DEFAULT '{}',
  map_settings JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Venues table
CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  address VARCHAR(500),
  city VARCHAR(100),
  state VARCHAR(50),
  country VARCHAR(50),
  postal_code VARCHAR(20),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  venue_type VARCHAR(20) NOT NULL CHECK (venue_type IN ('brewery', 'winery')),
  source VARCHAR(20) NOT NULL CHECK (source IN ('osm', 'brewerydb', 'manual')),
  source_id VARCHAR(100),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_venues_location ON venues USING GIST (
  ll_to_earth(latitude, longitude)
); -- PostGIS spatial index

CREATE INDEX idx_venues_name ON venues (name);
CREATE INDEX idx_venues_type ON venues (venue_type);

-- Visits table
CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  arrival_time TIMESTAMP WITH TIME ZONE NOT NULL,
  departure_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER GENERATED ALWAYS AS (
    CASE
      WHEN departure_time IS NOT NULL
      THEN EXTRACT(EPOCH FROM (departure_time - arrival_time)) / 60
      ELSE NULL
    END
  ) STORED,
  is_active BOOLEAN NOT NULL DEFAULT true,
  detection_method VARCHAR(10) NOT NULL DEFAULT 'auto' CHECK (detection_method IN ('auto', 'manual')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_visits_user_time ON visits (user_id, arrival_time DESC);
CREATE INDEX idx_visits_venue ON visits (venue_id);
CREATE INDEX idx_visits_active ON visits (is_active) WHERE is_active = true;

-- Row-Level Security
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_visits ON visits
  FOR ALL
  USING (auth.uid() = user_id);

-- Shared visits table
CREATE TABLE shared_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL UNIQUE REFERENCES visits(id) ON DELETE CASCADE,
  venue_name VARCHAR(200) NOT NULL,
  venue_city VARCHAR(100),
  visit_date DATE NOT NULL,
  shared_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_shared_visits_visit ON shared_visits (visit_id);
CREATE INDEX idx_shared_visits_expires ON shared_visits (expires_at) WHERE expires_at IS NOT NULL;

-- RLS: Shared visits are publicly readable
ALTER TABLE shared_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY public_shared_visits ON shared_visits
  FOR SELECT
  USING (expires_at IS NULL OR expires_at > NOW());
```

---

## Redis Data Structures

### Geospatial Index
```redis
# Store all venues with geospatial coordinates
GEOADD venues:all <longitude> <latitude> <venue_id>

# Example query: Find venues within 5km of user location
GEORADIUS venues:all -122.4194 37.7749 5000 m WITHDIST COUNT 50
```

### Venue Metadata Cache
```redis
# Store venue details as hash
HSET venue:<venue_id> name "Anchor Brewing" city "San Francisco" type "brewery"

# TTL: 7 days (604800 seconds)
EXPIRE venue:<venue_id> 604800
```

---

## Client-Side Storage (IndexedDB)

**Store**: `visits`

**Schema**:
```typescript
{
  id: string;           // UUID
  userId: string;       // UUID
  venueId: string;      // UUID
  arrivalTime: string;  // ISO 8601
  departureTime?: string;
  durationMinutes?: number;
  isActive: boolean;
  detectionMethod: 'auto' | 'manual';
  synced: boolean;      // Client-side only
  createdAt: string;
  updatedAt: string;
}
```

**Indexes**:
- `userId`
- `arrivalTime`
- `synced` (for sync queue queries)

---

## Summary

All entities defined with:
- Clear attributes and types
- Validation rules mapped to constitutional requirements
- Privacy-preserving design (no GPS coords, rounded timestamps)
- Efficient indexes for performance
- RLS policies for data isolation
- Client-side storage strategy for offline-first architecture

Ready to proceed to API contract definition.
