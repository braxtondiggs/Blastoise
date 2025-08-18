# Blastoise - Brewery Tracking Application

Blastoise is a brewery tracking application that shows whether someone named "Braxton" is currently at a brewery location. The system consists of an Angular Progressive Web App (PWA), Firebase Functions backend, and Deno scripts for processing Google Location History data.

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Prerequisites
- Node.js v20+ (current: v20.19.4)
- npm v10+ (current: v10.8.2) 
- Chrome/Chromium for testing (available as ChromeHeadless)
- Firebase CLI (NOT available in sandbox - document workarounds)
- Deno (NOT available in sandbox - document limitations)

### Bootstrap and Build the Repository
Run these commands in order to set up the development environment:

```bash
# Install main project dependencies
npm install
# Takes ~1 minute. NEVER CANCEL. Set timeout to 120+ seconds.

# Install Firebase Functions dependencies  
cd functions && npm install && cd ..
# Takes ~10 seconds. NEVER CANCEL. Set timeout to 60+ seconds.

# Build the Angular application
npm run build
# Takes ~30 seconds. NEVER CANCEL. Set timeout to 120+ seconds.
# Note: Build succeeds but shows budget warnings - this is expected.
```

### Development Server
Start the Angular development server:

```bash
npm start
# Starts dev server on http://localhost:4200/
# Takes ~30 seconds to compile. NEVER CANCEL. Set timeout to 120+ seconds.
# Note: Font loading errors are expected in sandbox environments.
```

### Testing
Run unit tests (with known limitations):

```bash
npm run test -- --watch=false --browsers=ChromeHeadless
# Takes ~7 seconds. NEVER CANCEL. Set timeout to 60+ seconds.
# Note: Tests currently fail due to missing Firebase configuration mocks.
# This is a known issue - tests require proper Firebase setup.
```

### Linting
```bash
# Main project linting
npm run lint
# Returns error: lint target not configured (TSLint is deprecated)

# Firebase Functions linting (WORKS)
cd functions && npm run lint && cd ..
# Takes ~5 seconds. This command works and should always pass.
```

### Firebase Functions
```bash
# Lint Firebase Functions (WORKS)
cd functions && npm run lint && cd ..

# Build Firebase Functions (CURRENTLY BROKEN)
cd functions && npm run build && cd ..
# Currently fails due to TypeScript compatibility issues with @types/ws
# Known issue: Type 'Server' is not generic errors
```

## Validation Scenarios

### Angular Application Testing
After making changes to the Angular application:

1. **Build Validation**: Always run `npm run build` and verify it completes successfully
2. **Development Server**: Start `npm start` and verify the server starts on localhost:4200
3. **Basic Functionality**: The app should show either:
   - "Braxton's **is** at [brewery name]! 🍻" with location details and map
   - "Braxton's **not** at a brewery! 😱" when no current location

### Firebase Functions Testing  
After making changes to Firebase Functions:

1. **Lint Check**: Always run `cd functions && npm run lint` - this must pass
2. **Build Check**: Run `cd functions && npm run build` (currently broken, document any fixes)

### End-to-End Validation
**CRITICAL**: Manual testing scenarios to validate complete functionality:

1. **Development Server**: Run `npm start` and verify:
   - Server starts on localhost:4200 after ~27 seconds
   - Build completes successfully (ignore font loading errors - expected in sandbox)
   - Server shows "Angular Live Development Server is listening" message

2. **Production Build**: Run `npm run build` and verify:
   - Build completes with warnings but succeeds (budget warnings expected)
   - Assets are generated in `dist/` directory
   - Note: Build may fail on index.html generation due to font loading in sandbox - this is expected

3. **Application Functionality** (when working outside sandbox):
   - Home page loads and shows brewery status
   - Navigation to /admin route works
   - Notification permission requests function properly
   - Google Maps integration displays brewery locations

## Important Timing and Timeout Information

**CRITICAL TIMEOUT VALUES:**
- `npm install`: 120+ seconds (never cancel, takes ~1 minute)
- `npm run build`: 120+ seconds (never cancel, takes ~30 seconds)
- `npm start`: 120+ seconds (never cancel, takes ~30 seconds to start)
- `npm test`: 60+ seconds (never cancel, takes ~7 seconds)
- Functions linting: 30+ seconds (never cancel, takes ~5 seconds)

**NEVER CANCEL any build or test commands**. The Angular build process may take up to 30 seconds, and dependency installation can take over a minute.

## Project Structure and Key Files

### Repository Root
```
/
├── src/                    # Angular application source
├── functions/              # Firebase Functions backend
├── deno/                   # Deno scripts for data processing  
├── e2e/                    # E2E tests (Protractor - deprecated)
├── .github/workflows/      # GitHub Actions CI/CD
├── angular.json           # Angular CLI configuration
├── firebase.json          # Firebase hosting configuration
├── package.json           # Main project dependencies
└── README.md              # Basic Angular CLI documentation
```

### Key Angular Files
- `src/app/home/`: Main brewery status display component
- `src/app/admin/`: Admin interface for brewery management
- `src/app/core/`: Shared modules and services
- `src/environments/`: Firebase configuration (development/production)

### Key Firebase Files  
- `functions/src/index.ts`: Main Firebase Functions entry point
- `functions/src/blastoise.ts`: Data import utilities
- `functions/src/db.ts`: Firestore database connection

### Key Configuration Files
- `.firebaserc`: Firebase project configuration
- `ngsw-config.json`: Progressive Web App service worker config
- `tslint.json`: TSLint configuration (deprecated)

## Known Issues and Workarounds

### Build Issues
1. **Angular Budget Warnings**: The build exceeds size budgets but still succeeds - this is expected
2. **Firebase Functions Build**: Currently fails with TypeScript errors - needs dependency updates  
3. **Font Loading Errors**: Development server and builds show font loading errors in sandbox environments
4. **Index.html Generation**: Production builds may fail on index.html generation due to font inlining issues in sandbox

### Testing Issues  
1. **Unit Tests**: Fail due to missing Firebase configuration mocks in test setup
2. **E2E Tests**: Use deprecated Protractor and fail due to network restrictions
3. **Linting**: Main project has no lint target configured (TSLint deprecated)

### Environment Limitations
1. **Firebase CLI**: Not available in sandbox - cannot deploy or run emulators
2. **Deno**: Not available in sandbox - cannot run location history processing scripts
3. **Network Access**: Limited external API access affects Google Fonts, Maps, and other services
4. **UI Testing**: Limited browser testing capabilities in sandbox environment

## Development Workflow

### Making Changes to Angular Components
1. Run `npm start` to start development server
2. Make your changes to files in `src/` 
3. Verify changes in browser at localhost:4200
4. Run `npm run build` to verify production build works
5. Test key user scenarios manually

### Making Changes to Firebase Functions
1. Make changes to files in `functions/src/`
2. Run `cd functions && npm run lint` to verify linting passes
3. Attempt `cd functions && npm run build` (currently broken)
4. Test API endpoints if Firebase CLI becomes available

### Common Development Tasks
- **Add new Angular component**: `ng generate component component-name`
- **Add new service**: `ng generate service service-name`  
- **Update dependencies**: Carefully test builds after updates
- **Firebase deployment**: Requires `firebase deploy` (CLI not available)

## Application Architecture

### Frontend (Angular)
- **Framework**: Angular 13 with Material Design
- **PWA**: Service worker enabled with offline capabilities
- **State Management**: Firebase services for real-time data
- **Notifications**: Push notifications via Firebase Messaging

### Backend (Firebase)
- **Functions**: Node.js Express.js API endpoints
- **Database**: Firestore for brewery and location data
- **Authentication**: Firebase Auth (configured but minimal usage)
- **Hosting**: Firebase Hosting for static files

### Data Processing (Deno)
- **Purpose**: Process Google Location History JSON files
- **Scripts**: 
  - `condense.ts`: Combine and compress location data
  - `search.ts`: Find brewery visits in location history

### External APIs
- **Google Maps**: Static map images and geocoding
- **Geocodio**: Address geocoding services
- **Firebase**: Real-time database and authentication

Always test the core user flow after making changes: view current brewery status and verify location display works correctly.