# Google Timeline Import - Quick Start Guide

**Last Updated**: 2025-01-04
**Feature Branch**: `001-003-google-timeline-import`

## Overview

This guide will walk you through importing your brewery and winery visits from Google Timeline into Blastoise in under 15 minutes.

## Prerequisites

- **Blastoise account** (authenticated or anonymous mode)
- **Google Timeline export** (JSON format)
- **Supported platforms**: Web (PWA), iOS, Android

## Export Your Google Timeline Data

### Method 1: Android/iOS (Recommended - Recent Data)

1. Open **Google Maps** on your mobile device
2. Tap your **profile icon** → **Your Timeline**
3. Tap the **three dots** (⋮) → **Settings and privacy**
4. Scroll to **Export Timeline data** → **Export your Timeline to JSON**
5. Select **Date range** (e.g., last 3 months)
6. Tap **Export** → Save the `.json` file

### Method 2: Google Takeout (Full History)

1. Go to [Google Takeout](https://takeout.google.com/)
2. Click **Deselect all** → Select **Location History** only
3. Choose **JSON** format (not KML)
4. Click **Next step** → **Create export**
5. Wait for email notification (~1-24 hours for large exports)
6. Download and extract the ZIP file
7. Locate the Timeline file: `Takeout/Location History/Records.json`

**Note**: Google Takeout exports can be very large (100MB+). For faster processing, use Method 1 (mobile export) for recent data only.

---

## Sample Timeline JSON

Below is a sample Google Timeline JSON with 3 brewery visits. Use this to test the import feature:

```json
{
  "timelineObjects": [
    {
      "placeVisit": {
        "location": {
          "name": "Ballast Point Brewing Company",
          "placeId": "ChIJabcdef1234567890",
          "address": "2215 India St, San Diego, CA 92101",
          "latitudeE7": 327249830,
          "longitudeE7": -1171656720
        },
        "duration": {
          "startTimestamp": "2024-12-15T16:30:00Z",
          "endTimestamp": "2024-12-15T18:15:00Z"
        }
      }
    },
    {
      "placeVisit": {
        "location": {
          "name": "Stone Brewing World Bistro & Gardens",
          "placeId": "ChIJ98765xyz4321fedcba",
          "address": "1999 Citracado Pkwy, Escondido, CA 92029",
          "latitudeE7": 330850000,
          "longitudeE7": -1170400000
        },
        "duration": {
          "startTimestamp": "2024-12-10T14:00:00Z",
          "endTimestamp": "2024-12-10T16:30:00Z"
        }
      }
    },
    {
      "placeVisit": {
        "location": {
          "name": "Modern Times Beer",
          "address": "3000 Upas St, San Diego, CA 92104",
          "latitudeE7": 327324000,
          "longitudeE7": -1171517000
        },
        "duration": {
          "startTimestamp": "2024-12-05T19:00:00Z",
          "endTimestamp": "2024-12-05T21:15:00Z"
        }
      }
    }
  ]
}
```

**Save this as** `sample-timeline.json` for testing.

---

## Import Process

### Step 1: Navigate to Import Wizard

**Web**:
- Go to **Settings** → **Data Management**
- Click **"Import Google Timeline"**

**Mobile**:
- Tap **Settings** (⚙️) → **Data**
- Tap **"Import Google Timeline"**

### Step 2: Choose Import Source

- Select **"Google Timeline (JSON)"**
- Review the privacy notice (only venue IDs are stored, no GPS coordinates)

### Step 3: Upload Your File

**Web**:
- Click **"Choose File"** → Select your `.json` file
- Supported size: Up to 100MB

**Mobile**:
- Tap **"Select File from Device"**
- Choose from Files app, Downloads, or Google Drive

### Step 4: Processing

**Small Files (<100 places)**: Processed instantly (5-30 seconds)

**Large Files (≥100 places)**: Queued for async processing
- You'll see a **Job ID** and progress bar
- Safe to close the app - you'll get a push notification when complete
- Poll status: The app automatically refreshes every 2 seconds

### Step 5: Review Results

The import summary shows:
- ✅ **Total places** found in Timeline file
- ✅ **Visits created** (new brewery/winery visits)
- ⏭️ **Visits skipped** (duplicates or non-breweries)
- 🏭 **New venues created** (places not in database)
- 🔗 **Existing venues matched** (linked to known venues)
- ⏱️ **Processing time** in milliseconds
- ⚠️ **Errors** (if any - click to see details)

---

## Import Statistics Explained

### Tier Statistics

The import uses a **three-tier verification strategy** to determine if a place is a brewery or winery:

- **Tier 1 (Keyword Matching)**: Fast on-device detection using keywords like "brewery", "taproom", "winery"
  - **Pros**: Instant, works offline
  - **Cons**: May miss places with non-obvious names

- **Tier 2 (Open Brewery DB)**: API-based verification *(coming soon)*
  - **Pros**: High accuracy for breweries, 30-day cache
  - **Cons**: Requires internet, slower

- **Tier 3 (Google Search)**: Search-based verification *(coming soon)*
  - **Pros**: Catches edge cases, 60-day cache
  - **Cons**: Rate-limited, 500ms delays

**Current Implementation**: Only Tier 1 (keyword matching) is active. Tier 2/3 will be added in future updates.

### Example Summary

```
✅ Import Successful
━━━━━━━━━━━━━━━━━━━━━
📊 Statistics:
   Total Places: 150
   Visits Created: 42
   Visits Skipped: 108
   New Venues: 12
   Matched Venues: 30
   Processing Time: 2,345 ms

🎯 Verification Breakdown:
   Tier 1 (Keyword): 42 matches
   Tier 2 (API): 0 matches
   Tier 3 (Search): 0 matches
   Unverified: 108 places
```

**Why were 108 places skipped?**
- Not breweries or wineries (e.g., restaurants, parks, grocery stores)
- Duplicate visits (already in your timeline)
- Missing required fields (no coordinates or timestamp)

---

## Troubleshooting

### Import Failed: "Invalid Timeline data"

**Cause**: Incorrect file format or corrupted JSON

**Solutions**:
1. Verify the file is valid JSON using [JSONLint](https://jsonlint.com/)
2. Re-export from Google Maps or Google Takeout
3. Try the sample JSON above to verify the import system works

### Import Failed: "File too large"

**Cause**: File exceeds 100MB limit

**Solutions**:
1. Use Method 1 (mobile export) instead of Google Takeout
2. Split your Takeout data by year using a text editor
3. Contact support for manual large file processing

### No Visits Created (All Skipped)

**Cause**: Timeline data doesn't contain brewery/winery visits

**Solutions**:
1. Review the error log for specific reasons
2. Check if your Timeline export includes the correct date range
3. Verify you visited breweries/wineries during the selected period
4. Try the sample JSON above to verify the classifier works

### Duplicate Visits Detected

**Cause**: You've already imported this data

**Behavior**: Blastoise automatically skips duplicate visits within the same 15-minute window to prevent data pollution.

**This is expected!** No action needed.

### Import Stuck at "Processing"

**Cause**: Large file (≥100 places) queued for async processing

**Solutions**:
1. Wait up to 5 minutes for large files (500+ places)
2. Check **Settings → Import History** for job status
3. Close and reopen the app (progress is saved)
4. If stuck >10 minutes, contact support with your **Job ID**

---

## Privacy & Data Handling

### What Gets Stored

✅ **Stored**:
- Venue IDs (reference to venue database)
- Venue names (e.g., "Ballast Point Brewing")
- Visit timestamps (rounded to nearest 15 minutes)
- Source: `google_timeline`

❌ **NOT Stored**:
- Precise GPS coordinates (latitude/longitude)
- Full addresses
- Google Place IDs (used for matching, then discarded)
- Raw Timeline JSON

### Why No GPS Coordinates?

**Privacy-first design**: Blastoise only stores venue references and rounded timestamps to prevent:
- Timing attacks (15-minute rounding prevents precise location tracking)
- Reverse geocoding (can't reconstruct your exact path)
- Data leaks (even if the database is compromised, your precise locations are safe)

**How it works**:
1. Parse Timeline JSON (in-memory only)
2. Match places to existing venues using Place ID or proximity (100m radius)
3. Store only the venue ID and rounded timestamp
4. Delete the raw Timeline data

---

## Import History & Audit

### View Past Imports

**Web**: Settings → Data Management → Import History
**Mobile**: Settings → Data → Import History

Each import record shows:
- 📅 Import date/time
- 📄 File name
- 📊 Statistics (places, visits created, errors)
- ⏱️ Processing time
- 🔍 **View Details** (click for full error log)

### Delete Imported Visits

**Not currently supported** - Coming in a future update.

**Workaround**: Manually delete individual visits from your timeline if needed.

---

## Next Steps

After importing:

1. **Review Your Timeline**: Visit the **Timeline** page to see your imported visits
2. **Explore the Map**: Check the **Map** page to see your visited venues on an interactive map
3. **Share Your Visits**: Create anonymized share links (Settings → Privacy → Sharing)
4. **Import More Data**: Repeat the process for different date ranges or data sources

---

## Support & Feedback

**Issues?** Report bugs at [GitHub Issues](https://github.com/anthropics/blastoise/issues)

**Questions?** Contact support@blastoise.app

**Feature Requests?** Vote on the [Roadmap](https://blastoise.app/roadmap)

---

## Technical Details

### File Format Compatibility

**Supported Formats**:
- ✅ Google Timeline (mobile export - `timeline.json`)
- ✅ Google Takeout (Location History - `Records.json`)
- ✅ Legacy Takeout format (`Semantic Location History/YYYY/YYYY_MONTH.json`)

**Not Supported**:
- ❌ KML/KMZ files (re-export as JSON)
- ❌ CSV exports (not supported by Google Maps)
- ❌ Apple Maps Timeline (coming soon)

### API Endpoints

**POST** `/api/v1/import/google-timeline`
- **Auth**: Required (JWT bearer token)
- **Body**: `{ "timelineData": { ... } }`
- **Response**: `ImportSummaryDto` (sync) or `{ jobId: string }` (async)

**GET** `/api/v1/import/status/:jobId`
- **Auth**: Required
- **Response**: `{ status: 'active' | 'completed' | 'failed', progress: number, result?: ImportSummaryDto }`

**GET** `/api/v1/import/history?limit=50&offset=0`
- **Auth**: Required
- **Response**: `{ imports: ImportHistory[], total: number }`

---

## Changelog

**v1.0.0** (2025-01-04)
- Initial release
- Tier 1 keyword matching
- Sync/async processing
- Import history
- Mobile and web support

**Upcoming** (v1.1.0)
- Tier 2: Open Brewery DB verification
- Tier 3: Google Search verification
- Delete imported visits
- Apple Maps Timeline support

---

## License

Copyright © 2025 Blastoise. All rights reserved.

**Privacy Policy**: [blastoise.app/privacy](https://blastoise.app/privacy)
**Terms of Service**: [blastoise.app/terms](https://blastoise.app/terms)
