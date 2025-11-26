# Blastoise Troubleshooting Guide

This guide covers common issues and their solutions when developing, deploying, and using Blastoise.

## Table of Contents

- [Development Issues](#development-issues)
- [Build & Deployment Issues](#build--deployment-issues)
- [Authentication Issues](#authentication-issues)
- [Visit Tracking Issues](#visit-tracking-issues)
- [Map & Venue Discovery Issues](#map--venue-discovery-issues)
- [Offline Sync Issues](#offline-sync-issues)
- [Performance Issues](#performance-issues)
- [Database & Migration Issues](#database--migration-issues)
- [Mobile-Specific Issues](#mobile-specific-issues)

---

## Development Issues

### Issue: `npm install` fails with peer dependency conflicts

**Symptoms:**
```
npm ERR! Could not resolve dependency:
npm ERR! peer @angular/core@"^20.0.0" from ...
```

**Solution:**
```bash
# Use --legacy-peer-deps flag
npm install --legacy-peer-deps

# Or use --force (not recommended)
npm install --force
```

**Prevention:** Ensure all Angular packages are on the same major version.

---

### Issue: Nx commands fail with "Cannot find module" errors

**Symptoms:**
```
Error: Cannot find module '@nx/angular'
```

**Solution:**
```bash
# Clear Nx cache
npx nx reset

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild all projects
npx nx run-many --target=build --all
```

---

### Issue: Redis connection fails during development

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Solution:**
```bash
# Start Redis via Docker Compose
cd docker && docker-compose up -d redis

# Verify Redis is running
docker ps | grep redis

# Test connection
redis-cli ping
# Should return: PONG
```

**Alternative:** Use a cloud Redis instance (Upstash, Redis Cloud) and update `.env`:
```env
REDIS_HOST=your-redis-instance.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your-password
```

---

### Issue: Database connection fails

**Symptoms:**
```
Error: Connection terminated unexpectedly
Status: 503
```

**Solution:**

1. **Check environment variables** in `apps/api/.env`:
   ```env
   DATABASE_HOST=localhost
   DATABASE_PORT=5432
   DATABASE_USERNAME=postgres
   DATABASE_PASSWORD=postgres
   DATABASE_NAME=blastoise
   ```

2. **Verify PostgreSQL is running:**
   ```bash
   cd docker && docker-compose ps postgres
   docker-compose logs postgres
   ```

3. **Test database connection:**
   ```bash
   psql -U postgres -h localhost -d blastoise -c "SELECT 1;"
   ```

---

## Build & Deployment Issues

### Issue: Bundle size exceeds 2MB limit

**Symptoms:**
```
Error: Bundle budget exceeded
Initial bundle: 2.3 MB (maximum: 2 MB)
```

**Solution:**

1. **Analyze bundle size:**
   ```bash
   npx nx build web --stats-json
   npx webpack-bundle-analyzer dist/apps/web/stats.json
   ```

2. **Common causes and fixes:**
   - Remove unused imports and libraries
   - Lazy load routes and feature modules
   - Use dynamic imports for heavy libraries:
     ```typescript
     // Instead of: import * as L from 'leaflet';
     const L = await import('leaflet');
     ```
   - Optimize images and assets
   - Remove development-only code in production builds

---

### Issue: Docker build fails with "ENOSPC: no space left on device"

**Symptoms:**
```
error An unexpected error occurred: "ENOSPC: no space left on device"
```

**Solution:**
```bash
# Clean up Docker resources
docker system prune -a --volumes

# Increase Docker disk space (Docker Desktop)
# Settings > Resources > Disk image size
```

---

### Issue: CI/CD pipeline fails on affected builds

**Symptoms:**
```
Error: No tasks were run because no projects were affected
```

**Solution:**

1. **Check base branch configuration** in `.github/workflows/ci.yml`:
   ```yaml
   --base=origin/${{ github.base_ref || 'master' }}
   ```

2. **Force full build** when needed:
   ```bash
   npx nx run-many --target=build --all --configuration=production
   ```

3. **Check Nx cache** is properly configured:
   ```bash
   npx nx reset
   ```

---

## Authentication Issues

### Issue: Users stuck on infinite loading after login

**Symptoms:**
- Login succeeds but app doesn't navigate
- Console shows "User is undefined"

**Solution:**

1. **Check session persistence:**
   ```typescript
   // In auth.service.ts
   const session = this.authStateService.session();
   if (!session) {
     // Session not persisted - check if refresh token is in cookie
   }
   ```

2. **Verify browser cookies are enabled** (required for refresh token storage).

3. **Check CORS configuration** in `apps/api/src/main.ts`:
   ```typescript
   app.enableCors({
     origin: ['http://localhost:4200', 'http://localhost:4201'],
     credentials: true, // Required for cookies
   });
   ```

---

### Issue: JWT token expired errors

**Symptoms:**
```
Error: JWT expired
Status: 401
```

**Solution:**

1. **Verify automatic refresh is working** - The refresh interceptor should handle 401 errors:
   ```typescript
   // Check apps/web/src/app/auth/interceptors/refresh.interceptor.ts
   ```

2. **Check refresh token cookie** is present and not expired.

3. **Verify JWT_ACCESS_EXPIRATION** in API `.env` (default: 15m).

---

### Issue: Anonymous mode not working

**Symptoms:**
- App requires login even when anonymous mode is enabled
- Local visits not saving

**Solution:**

1. **Verify IndexedDB is accessible:**
   ```javascript
   // Check in browser console
   indexedDB.databases().then(console.log);
   ```

2. **Check browser storage quota:**
   ```javascript
   navigator.storage.estimate().then(console.log);
   ```

3. **Ensure service worker is registered** for offline support.

---

## Visit Tracking Issues

### Issue: Visits not detected automatically

**Symptoms:**
- User enters venue geofence but no visit is created
- Background tracking not working

**Solution:**

1. **Check location permissions:**
   ```typescript
   const status = await Geolocation.checkPermissions();
   console.log('Location permission:', status.location);
   // Should be: 'granted'
   ```

2. **Verify geofence service is running:**
   ```typescript
   // Check geofence-tracker.service.ts
   console.log('Monitoring status:', this.isMonitoring);
   ```

3. **Check venue proximity:**
   ```bash
   # Distance should be < 150 meters
   # Use haversine distance calculation to verify
   ```

4. **Verify dwell time threshold** (default: 10 minutes):
   ```typescript
   // In geofence-tracker.service.ts
   const DWELL_TIME_THRESHOLD = 10 * 60 * 1000; // 10 minutes
   ```

5. **Platform-specific fixes:**

   **iOS:**
   - Enable "Always Allow" location permission
   - Check Background Modes in Xcode (Location updates)
   - Verify NSLocationAlwaysAndWhenInUseUsageDescription in Info.plist

   **Android:**
   - Enable "Allow all the time" location permission
   - Check for battery optimization exemptions
   - Verify ACCESS_BACKGROUND_LOCATION permission in AndroidManifest.xml

---

### Issue: Visit timestamps are incorrect

**Symptoms:**
- Timestamps don't match actual visit time
- Timezone issues

**Solution:**

1. **Check timestamp rounding** (privacy feature):
   ```typescript
   // Timestamps are rounded to nearest 15 minutes
   // This is expected behavior for privacy
   ```

2. **Verify timezone handling:**
   ```typescript
   // Use ISO 8601 format with timezone
   const timestamp = new Date().toISOString();
   ```

3. **Check device time settings** (ensure automatic timezone is enabled).

---

### Issue: Duplicate visits being created

**Symptoms:**
- Multiple visits for the same venue at the same time
- Sync creates duplicates

**Solution:**

1. **Check unique constraint** in database:
   ```sql
   -- visits table should have unique constraint on (user_id, venue_id, arrival_time)
   ```

2. **Verify sync logic** handles duplicates:
   ```typescript
   // In batch-sync, use upsert instead of insert
   ```

3. **Clear IndexedDB and resync:**
   ```javascript
   // Browser console
   indexedDB.deleteDatabase('blastoise-visits');
   ```

---

## Map & Venue Discovery Issues

### Issue: Map tiles not loading

**Symptoms:**
- Gray squares instead of map
- 404 errors for tile images

**Solution:**

1. **Check tile server URL** in venue-map component:
   ```typescript
   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
     attribution: '...',
     maxZoom: 19,
   })
   ```

2. **Verify network connectivity** (tile servers may be blocked).

3. **Use alternative tile provider** if OpenStreetMap is unavailable:
   ```typescript
   // Mapbox tiles (requires API key)
   L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
     id: 'mapbox/streets-v11',
     accessToken: 'your-mapbox-token',
   })
   ```

---

### Issue: Markers not clustering

**Symptoms:**
- All markers displayed individually
- Performance issues with many markers

**Solution:**

1. **Verify marker cluster plugin is loaded:**
   ```typescript
   import 'leaflet.markercluster';
   ```

2. **Check cluster configuration:**
   ```typescript
   this.markerClusterGroup = L.markerClusterGroup({
     maxClusterRadius: 50,
     spiderfyOnMaxZoom: true,
     disableClusteringAtZoom: 18,
   });
   ```

3. **Ensure markers are added to cluster group:**
   ```typescript
   this.markerClusterGroup.addLayer(marker);
   this.map.addLayer(this.markerClusterGroup);
   ```

---

### Issue: Nearby venues query returns no results

**Symptoms:**
- Proximity search returns empty array
- Redis geospatial query fails

**Solution:**

1. **Verify Redis geospatial index is populated:**
   ```bash
   redis-cli
   > ZCARD venues:geo
   # Should return number of venues
   ```

2. **Check coordinate format** (longitude, latitude):
   ```bash
   # Redis expects [longitude, latitude, name]
   > GEOPOS venues:geo "venue-id-here"
   ```

3. **Run cache warming script:**
   ```bash
   cd apps/api
   npx ts-node src/scripts/cache-warming.ts
   ```

4. **Verify search radius** (max: 100 km):
   ```typescript
   // In nearby-venues.dto.ts
   @Max(100)
   radius?: number;
   ```

---

## Offline Sync Issues

### Issue: Visits not syncing when back online

**Symptoms:**
- Visits remain in IndexedDB with `synced: false`
- No network requests observed

**Solution:**

1. **Check sync worker is running:**
   ```javascript
   // Browser console
   navigator.serviceWorker.getRegistrations().then(console.log);
   ```

2. **Verify online event listener:**
   ```typescript
   window.addEventListener('online', () => {
     this.syncService.syncPendingVisits();
   });
   ```

3. **Check for failed requests in IndexedDB:**
   ```javascript
   // Browser console
   const db = await indexedDB.open('blastoise-visits');
   const tx = db.transaction('visits', 'readonly');
   const visits = await tx.objectStore('visits').getAll();
   console.log('Unsynced visits:', visits.filter(v => !v.synced));
   ```

4. **Manually trigger sync:**
   ```typescript
   await this.syncService.syncAll();
   ```

---

### Issue: Sync fails with 429 Rate Limit error

**Symptoms:**
```
Error: Too many requests
Status: 429
Retry-After: 60
```

**Solution:**

1. **Implement exponential backoff** (already implemented):
   ```typescript
   // Check retry logic in visit-sync.service.ts
   const delay = Math.min(1000 * Math.pow(2, attempt), 60000);
   ```

2. **Reduce batch size:**
   ```typescript
   // In batch-visit-sync.dto.ts
   @MaxLength(50) // Reduce from 100
   visits: CreateVisitDto[];
   ```

3. **Increase rate limits** in production (Redis configuration).

---

## Performance Issues

### Issue: Slow timeline loading with many visits

**Symptoms:**
- Timeline takes > 5 seconds to load
- UI freezes during scroll

**Solution:**

1. **Enable virtual scrolling:**
   ```typescript
   // Install @angular/cdk
   npm install @angular/cdk

   // Use CdkVirtualScrollViewport
   ```

2. **Implement pagination:**
   ```typescript
   // Already implemented - verify page size
   const limit = 20; // visits per page
   ```

3. **Add indexes to IndexedDB:**
   ```typescript
   // Check indexeddb.service.ts
   visitStore.createIndex('userArrival', ['user_id', 'arrival_time']);
   ```

4. **Profile performance:**
   ```bash
   # Chrome DevTools > Performance tab
   # Record timeline loading
   ```

---

### Issue: High battery drain on mobile

**Symptoms:**
- Battery drains > 10% over 8 hours
- Device gets warm

**Solution:**

1. **Reduce location update frequency:**
   ```typescript
   // In geofence-tracker.service.ts
   const watchId = await Geolocation.watchPosition(
     { timeout: 30000, maximumAge: 60000 }, // 1 minute
     callback
   );
   ```

2. **Use significant location change** instead of continuous tracking:
   ```typescript
   // iOS: Use 'significant-change' mode
   // Android: Use PRIORITY_BALANCED_POWER_ACCURACY
   ```

3. **Implement smart tracking:**
   - Stop tracking when stationary
   - Reduce frequency at night
   - Pause tracking when battery < 20%

---

## Database & Migration Issues

### Issue: Migration fails with "relation already exists"

**Symptoms:**
```
Error: relation "visits" already exists
```

**Solution:**

1. **Check migration status:**
   ```bash
   npx typeorm migration:show -d apps/api/src/database/typeorm.config.ts
   ```

2. **Reset database** (development only):
   ```sql
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   ```

3. **Run migrations manually:**
   ```bash
   npx typeorm migration:run -d apps/api/src/database/typeorm.config.ts
   ```

---

### Issue: Access denied to resources

**Symptoms:**
```
Error: Unauthorized
Status: 401 or 403
```

**Solution:**

1. **Verify JWT token is valid:**
   ```typescript
   // Check browser Network tab for Authorization header
   // Authorization: Bearer <token>
   ```

2. **Verify user ID matches resource ownership:**
   ```typescript
   // In auth service
   const user = this.authStateService.currentUser();
   console.log('User ID:', user?.id);
   ```

3. **Check API endpoint requires authentication:**
   ```typescript
   // Endpoints without @Public() decorator require valid JWT
   ```

---

## Mobile-Specific Issues

### Issue: iOS build fails with Capacitor errors

**Symptoms:**
```
Error: Unable to find platform 'ios'
```

**Solution:**
```bash
# Add iOS platform
cd apps/mobile
npx cap add ios

# Sync Capacitor
npx cap sync ios

# Open in Xcode
npx cap open ios
```

---

### Issue: Android build fails with Gradle errors

**Symptoms:**
```
Error: Could not resolve all files for configuration ':app:debugCompileClasspath'
```

**Solution:**
```bash
# Clean Gradle cache
cd apps/mobile/android
./gradlew clean

# Update Gradle wrapper
./gradlew wrapper --gradle-version=8.5

# Sync dependencies
./gradlew --refresh-dependencies
```

---

### Issue: App crashes on launch (mobile)

**Symptoms:**
- App closes immediately after opening
- No error message visible

**Solution:**

1. **Check native logs:**

   **iOS (Xcode):**
   ```
   Window > Devices and Simulators > Select device > Open Console
   ```

   **Android (logcat):**
   ```bash
   adb logcat | grep "blastoise"
   ```

2. **Common causes:**
   - Missing Capacitor plugins
   - Invalid Info.plist / AndroidManifest.xml
   - Native build configuration errors

3. **Rebuild native projects:**
   ```bash
   npx cap sync
   ```

---

## Getting Help

If your issue is not covered in this guide:

1. **Check GitHub Issues:** https://github.com/yourusername/blastoise/issues
2. **Review logs:**
   - Browser console (F12)
   - API logs (`docker logs blastoise-api`)
   - Database logs (`docker logs blastoise-postgres`)
   - Sentry error tracking (if configured)
3. **Create a detailed bug report** with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, browser, Node version)
   - Relevant logs and screenshots
4. **Contact support:** support@blastoise.app

---

## Common Diagnostic Commands

```bash
# Check Node.js and npm versions
node --version  # Should be >= 22
npm --version

# Verify Nx installation
npx nx --version

# Check running processes
docker ps
lsof -i :3000  # API port
lsof -i :4200  # Web port
lsof -i :6379  # Redis port

# Test API health
curl http://localhost:3000/api/v1/health

# Check Redis connection
redis-cli ping

# View Postgres logs
docker logs blastoise-postgres

# Clear all caches
npx nx reset
rm -rf node_modules/.cache
rm -rf dist
```

---

**Last Updated:** 2025-11-25
**Version:** 1.1
