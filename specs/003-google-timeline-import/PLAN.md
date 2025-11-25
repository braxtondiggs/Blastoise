# Google Timeline Import - Plan of Attack

**Feature**: Import user visit history from Google Timeline/Location History
**Created**: 2025-01-04
**Status**: Planning Phase

---

## Executive Summary

Enable users to import their historical brewery and winery visits from Google Timeline (Semantic Location History) data, reducing manual data entry and providing instant value from existing location history.

---

## 1. Research Findings

### Google Timeline Export Methods (2024-2025)

**Important Change**: As of late 2024, Google moved Timeline data from cloud to on-device storage.

#### Export Options:

1. **Google Takeout** (Legacy/Historical Data)
   - Available for data prior to device-local migration
   - Exports to `Semantic Location History` folder
   - Format: JSON files partitioned by year/month
   - File naming: `YYYY_MONTH.json` (e.g., `2024_JANUARY.json`)

2. **Mobile Export** (Current Method)
   - **Android**: Settings → Location → Location Services → Timeline → Export Timeline Data
   - **iOS**: Google Maps app → Profile → Menu → Location and privacy settings → Export Timeline data
   - Format: Single `Timeline.json` file
   - Contains `semanticSegments` with place IDs and GPS coordinates

### Data Format Structure

#### Legacy Format (Google Takeout - Semantic Location History)

```json
{
  "timelineObjects": [
    {
      "placeVisit": {
        "location": {
          "latitudeE7": 375850847,
          "longitudeE7": -1223946965,
          "placeId": "ChIJH...",
          "address": "123 Main St, San Francisco, CA",
          "name": "Anchor Brewing Company",
          "semanticType": "TYPE_SEARCHED_ADDRESS",
          "locationConfidence": 87.65432
        },
        "duration": {
          "startTimestamp": "2024-01-15T14:30:00Z",
          "endTimestamp": "2024-01-15T16:45:00Z"
        },
        "placeConfidence": "HIGH_CONFIDENCE",
        "visitConfidence": 95,
        "editConfirmationStatus": "NOT_CONFIRMED"
      }
    },
    {
      "activitySegment": {
        "startLocation": {...},
        "endLocation": {...},
        "duration": {...},
        "distance": 1234,
        "activityType": "IN_VEHICLE"
      }
    }
  ]
}
```

#### New Format (Timeline.json from Mobile)

```json
{
  "semanticSegments": [
    {
      "startTime": "2024-01-15T14:30:00Z",
      "endTime": "2024-01-15T16:45:00Z",
      "placeVisit": {
        "location": {
          "placeId": "ChIJH...",
          "latLng": "37.5850847,-122.3946965",
          "name": "Anchor Brewing Company",
          "address": "1705 Mariposa St, San Francisco, CA 94107"
        },
        "visitConfidence": 0.95
      }
    },
    {
      "activity": {
        "start": {...},
        "end": {...},
        "distanceMeters": 1234,
        "topCandidate": {
          "type": "IN_VEHICLE",
          "probability": 0.87
        }
      }
    }
  ]
}
```

---

## 2. Feature Scope

### In Scope (MVP)

✅ **Import from JSON file** (both legacy and new formats)
✅ **Parse placeVisit entries only** (ignore activity segments)
✅ **Filter for breweries and wineries** using:
- Google Place Types
- Business name keywords
- Categories/tags

✅ **Match to existing Blastoise venues** via:
- Google Place ID
- Coordinates proximity
- Fuzzy name matching

✅ **Create new visits in database** with:
- Venue ID (matched or newly created)
- Arrival timestamp (rounded to 15 min for privacy)
- Departure timestamp (rounded to 15 min for privacy)
- User ID (authenticated users only)

✅ **Handle duplicates** - skip visits already in database
✅ **Provide import summary** - show counts of imported/skipped/failed
✅ **Web and mobile support** - file upload on both platforms

### Out of Scope (Future Enhancements)

❌ OAuth integration with Google Maps API (direct API access)
❌ Continuous sync (one-time import only)
❌ Import activity segments (travel routes)
❌ Import non-venue locations (home, work)
❌ Historical place photos
❌ Anonymous user imports (requires authentication)

---

## 3. Architecture Design

### High-Level Flow

```
User → Upload JSON → Frontend Parser → Validation →
→ Backend API → Filter Venues → Match Existing →
→ Create Visits → Return Summary → Display Results
```

### Component Breakdown

#### 3.1 Frontend Components

**Import Page Component** (`libs/features/import/`)
- File upload dropzone (DaisyUI)
- JSON validation
- Progress indicator
- Results display (success/error summary)
- Platform detection (web vs mobile file handling)

**Import Service** (`libs/features/import/services/`)
- Parse JSON file (support both formats)
- Extract `placeVisit` entries
- Basic client-side validation
- Send to backend API

#### 3.2 Backend API

**Import Module** (`apps/api/src/modules/import/`)

**Endpoints:**
```typescript
POST /api/v1/import/google-timeline
  - Body: { file: File | JSON }
  - Auth: Required (JWT)
  - Returns: { summary: ImportSummary }

GET /api/v1/import/history
  - Returns: List of past imports with metadata
```

**DTOs:**
```typescript
// Request
interface GoogleTimelineImportDto {
  data: GoogleTimelineData; // Parsed JSON
  userId: string;
}

// Response
interface ImportSummary {
  totalPlaces: number;
  breweryWineryPlaces: number;
  matchedVenues: number;
  newVenues: number;
  visitsCreated: number;
  visitsSkipped: number; // duplicates
  errors: ImportError[];
  processingTimeMs: number;
}

interface ImportError {
  place: string;
  reason: string;
  timestamp: string;
}
```

**Service Logic:**

1. **Parse and Validate**
   - Detect format (legacy vs new)
   - Validate JSON structure
   - Extract all `placeVisit` objects

2. **Filter for Breweries/Wineries**
   - Check Google Place Types: `["bar", "night_club", "restaurant"]` with subcategories
   - Keyword matching: "brewery", "winery", "taproom", "tasting room", "cidery"
   - Use venue name, business type, categories

3. **Venue Matching**
   ```typescript
   async matchVenue(googlePlace: GooglePlace): Promise<Venue | null> {
     // 1. Check by Google Place ID (exact match)
     const byPlaceId = await this.venueRepo.findByGooglePlaceId(googlePlace.placeId);
     if (byPlaceId) return byPlaceId;

     // 2. Check by proximity (within 100m) and name similarity
     const nearby = await this.venueRepo.findNearby(googlePlace.coords, 100);
     const fuzzyMatch = nearby.find(v =>
       similarity(v.name, googlePlace.name) > 0.8
     );
     if (fuzzyMatch) return fuzzyMatch;

     // 3. No match - create new venue
     return await this.venueRepo.create({
       name: googlePlace.name,
       googlePlaceId: googlePlace.placeId,
       latitude: googlePlace.latitude,
       longitude: googlePlace.longitude,
       address: googlePlace.address,
       type: this.inferVenueType(googlePlace), // brewery or winery
       source: 'google_import'
     });
   }
   ```

4. **Visit Creation**
   ```typescript
   async createVisit(userId: string, venue: Venue, duration: Duration): Promise<Visit> {
     // Check for duplicate
     const existing = await this.visitRepo.findByUserVenueTime(
       userId,
       venue.id,
       duration.startTimestamp
     );
     if (existing) {
       return null; // Skip duplicate
     }

     // Round timestamps to 15-minute intervals (privacy)
     const roundedStart = roundTo15Minutes(duration.startTimestamp);
     const roundedEnd = roundTo15Minutes(duration.endTimestamp);

     return await this.visitRepo.create({
       userId,
       venueId: venue.id,
       arrivalTime: roundedStart,
       departureTime: roundedEnd,
       source: 'google_import',
       importedAt: new Date()
     });
   }
   ```

5. **Import History Tracking**
   - Store metadata about each import
   - Track: timestamp, file size, records processed, results
   - Prevent duplicate imports of same data

#### 3.3 Database Changes

**New Table: `import_history`**
```sql
CREATE TABLE import_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source VARCHAR(50) NOT NULL, -- 'google_timeline'
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  file_name VARCHAR(255),
  total_places INTEGER NOT NULL,
  visits_created INTEGER NOT NULL,
  visits_skipped INTEGER NOT NULL,
  new_venues_created INTEGER NOT NULL,
  processing_time_ms INTEGER,
  metadata JSONB, -- store summary, errors, etc.
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE INDEX idx_import_history_user ON import_history(user_id);
CREATE INDEX idx_import_history_source ON import_history(source);
```

**Update `venues` table:**
```sql
ALTER TABLE venues
ADD COLUMN google_place_id VARCHAR(255) UNIQUE,
ADD COLUMN source VARCHAR(50) DEFAULT 'manual'; -- 'manual', 'google_import', 'user_created'

CREATE INDEX idx_venues_google_place_id ON venues(google_place_id);
```

**Update `visits` table:**
```sql
ALTER TABLE visits
ADD COLUMN source VARCHAR(50) DEFAULT 'auto_detect', -- 'auto_detect', 'google_import', 'manual'
ADD COLUMN imported_at TIMESTAMPTZ;

CREATE INDEX idx_visits_source ON visits(source);
```

---

## 4. User Experience (UX) Flow

### 4.1 Import Wizard (Settings Page)

**Step 1: Choose Import Source**
```
┌─────────────────────────────────────────┐
│  Import Your Visit History              │
├─────────────────────────────────────────┤
│                                         │
│  [📍 Google Timeline]  [📱 Apple Maps]  │
│     (Available)        (Coming Soon)    │
│                                         │
│  Import past visits from your Google    │
│  Location History to see your complete  │
│  brewery and winery journey.            │
│                                         │
│  [Continue with Google Timeline]        │
└─────────────────────────────────────────┘
```

**Step 2: Export Instructions**
```
┌─────────────────────────────────────────┐
│  Export Your Google Timeline Data       │
├─────────────────────────────────────────┤
│                                         │
│  📱 On Android:                         │
│  1. Open Settings                       │
│  2. Location → Location Services        │
│  3. Timeline → Export Timeline Data     │
│  4. Choose folder and export            │
│                                         │
│  📱 On iPhone:                          │
│  1. Open Google Maps app                │
│  2. Tap profile icon                    │
│  3. Location and privacy settings       │
│  4. Export Timeline data                │
│                                         │
│  💻 Or use Google Takeout:              │
│  1. Go to takeout.google.com            │
│  2. Select "Location History"           │
│  3. Create export                       │
│  4. Download JSON file                  │
│                                         │
│  [I have my file ready]                 │
└─────────────────────────────────────────┘
```

**Step 3: Upload File**
```
┌─────────────────────────────────────────┐
│  Upload Timeline Data                   │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  │   Drag & drop JSON file here    │   │
│  │   or click to browse            │   │
│  │                                 │   │
│  │   📄 Accepted: .json            │   │
│  │   📊 Max size: 100 MB           │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ⚠️ Your data never leaves your device  │
│     until you click "Import"            │
│                                         │
│  [Cancel]              [Import Visits]  │
└─────────────────────────────────────────┘
```

**Step 4: Processing**
```
┌─────────────────────────────────────────┐
│  Importing Your Visits...               │
├─────────────────────────────────────────┤
│                                         │
│  ████████████░░░░░░░░░░░░  60%         │
│                                         │
│  📍 Processing locations...             │
│  🍺 Found 156 brewery visits            │
│  🍷 Found 42 winery visits              │
│                                         │
│  Please wait, this may take a moment.   │
└─────────────────────────────────────────┘
```

**Step 5: Results**
```
┌─────────────────────────────────────────┐
│  ✅ Import Complete!                    │
├─────────────────────────────────────────┤
│                                         │
│  📊 Import Summary:                     │
│                                         │
│  ✓ 198 brewery/winery visits found     │
│  ✓ 187 visits imported                 │
│  ✓ 45 new venues added                 │
│  ⊘ 11 duplicates skipped               │
│                                         │
│  🕐 Processed in 4.2 seconds            │
│                                         │
│  Your timeline now shows 187 more       │
│  visits spanning 3 years!               │
│                                         │
│  [View My Timeline]    [Done]           │
└─────────────────────────────────────────┘
```

### 4.2 Error Handling

**File Upload Errors:**
- Invalid JSON format → "This file doesn't appear to be valid Google Timeline data"
- File too large → "File size exceeds 100 MB limit"
- Wrong format → "This file format is not recognized. Please export Timeline.json"

**Processing Errors:**
- Network timeout → "Import timeout. Please try with a smaller date range"
- Server error → "Something went wrong. Your data is safe, please try again"
- Partial success → Show what was imported, allow retry for failed items

---

## 5. Privacy & Security Considerations

### 5.1 Data Privacy

✅ **Client-side parsing first** - validate before sending to server
✅ **No data retention** - delete uploaded file immediately after processing
✅ **Timestamp rounding** - maintain 15-minute privacy protection
✅ **User ownership** - all imported visits belong to authenticated user
✅ **GDPR compliance** - allow deletion of imported data

### 5.2 Security

✅ **Authentication required** - no anonymous imports
✅ **File size limits** - prevent DoS (100 MB max)
✅ **Rate limiting** - max 5 imports per day per user
✅ **Input validation** - sanitize all extracted data
✅ **No raw location storage** - store venue IDs only

---

## 6. Implementation Phases

### Phase 1: Core Import (MVP)
**Goal**: Basic file upload and import flow

- [ ] Create import feature library (`libs/features/import`)
- [ ] Create import UI component (file upload, instructions)
- [ ] Build JSON parser (support both formats)
- [ ] Create backend import endpoint
- [ ] Implement venue matching logic
- [ ] Add database schema changes
- [ ] Basic error handling and validation
- [ ] Import summary display

**Deliverable**: Users can upload Google Timeline JSON and import brewery/winery visits

### Phase 2: Enhanced Matching
**Goal**: Improve venue matching accuracy

- [ ] Implement fuzzy name matching (Levenshtein distance)
- [ ] Add venue type inference from Google categories
- [ ] Enhance coordinate proximity matching
- [ ] Add manual venue matching UI for ambiguous cases
- [ ] Implement duplicate detection improvements

**Deliverable**: Higher accuracy matching with fewer false positives

### Phase 3: User Experience Polish
**Goal**: Professional UX and error handling

- [ ] Add progress indicators with detailed status
- [ ] Implement batch processing for large files
- [ ] Add import preview (show what will be imported before confirming)
- [ ] Create import history page
- [ ] Add ability to undo imports
- [ ] Implement import scheduling (background processing)

**Deliverable**: Smooth, professional import experience

### Phase 4: Advanced Features (Future)
**Goal**: Additional import sources and intelligence

- [ ] Apple Maps import support
- [ ] Automated duplicate merging
- [ ] Smart venue suggestions
- [ ] Import analytics dashboard
- [ ] Export functionality (reverse operation)

---

## 7. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Google format changes | High | Version detection, format adapters |
| Large file processing | Medium | Stream processing, batch limits |
| Venue matching accuracy | High | Manual review UI, confidence scores |
| Duplicate detection failure | Medium | Multi-factor matching, user confirmation |
| Privacy breach | Critical | Client-side parsing, no raw data storage |
| Performance issues | Medium | Background jobs, pagination |

---

## 8. Success Metrics

**User Engagement:**
- % of users who attempt import
- % of successful imports
- Average visits imported per user
- Time to complete import

**Data Quality:**
- Venue match accuracy rate
- Duplicate detection accuracy
- User-reported errors

**Technical:**
- Processing time per 100 visits
- Error rate
- File upload success rate

---

## 9. Open Questions

1. **Venue Type Detection**: How accurately can we determine brewery vs winery from Google data?
   - **Answer Needed**: Research Google Place Types taxonomy

2. **Historical Data Limits**: Should we limit import to last N years?
   - **Recommendation**: No limit for MVP, add filtering in Phase 3

3. **Batch Size**: What's optimal batch size for processing?
   - **Testing Needed**: Benchmark with real data

4. **Manual Review**: When should we ask user to manually confirm venue matches?
   - **Recommendation**: Confidence score < 80%

5. **Integration Point**: Should this be in Settings or separate Import page?
   - **Recommendation**: Settings → Data Management → Import

---

## 10. Next Steps

### Immediate Actions:
1. ✅ Create this planning document
2. ⏳ Review and approve plan with team/stakeholders
3. ⏳ Create feature specification document
4. ⏳ Design database migrations
5. ⏳ Create UI mockups/wireframes
6. ⏳ Set up development environment
7. ⏳ Implement Phase 1 (MVP)

### Before Starting Implementation:
- [ ] Obtain sample Google Timeline JSON files for testing
- [ ] Define exact venue type matching rules
- [ ] Create test data set with known breweries/wineries
- [ ] Set up monitoring and logging for import jobs
- [ ] Define rollback strategy for failed imports

---

**Document Version**: 1.0
**Last Updated**: 2025-01-04
**Status**: Awaiting Approval
