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
# Starts dev server with HMR on http://localhost:4200/
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
# Main project linting (ESLint)
npm run lint
# Works with ESLint configuration for Angular 20

# Fix linting issues automatically
npm run lint:fix

# Firebase Functions linting (WORKS)
cd functions && npm run lint && cd ..
# Takes ~5 seconds. This command works and should always pass.
```

### Firebase Functions
```bash
# Lint Firebase Functions (WORKS)
cd functions && npm run lint && cd ..

# Build Firebase Functions
cd functions && npm run build && cd ..
# Now works with Node.js 20 runtime and updated dependencies

# Run Firebase Functions tests
cd functions && npm run test && cd ..
# Jest-based testing for Functions

# Deploy Functions only
npm run deploy:functions
```

## Validation Scenarios

### Angular Application Testing
After making changes to the Angular application:

1. **Build Validation**: Always run `npm run build` or `npm run build:prod` and verify it completes successfully
2. **Development Server**: Start `npm start` and verify the server starts on localhost:4200
3. **Linting**: Run `npm run lint` to check code style and `npm run lint:fix` to auto-fix issues
4. **Basic Functionality**: The app should show either:
   - "Braxton's **is** at [brewery name]! 🍻" with location details and map
   - "Braxton's **not** at a brewery! 😱" when no current location

### Firebase Functions Testing  
After making changes to Firebase Functions:

1. **Lint Check**: Always run `cd functions && npm run lint` - this must pass
2. **Build Check**: Run `cd functions && npm run build` - should complete successfully
3. **Test Check**: Run `cd functions && npm run test` - Jest tests should pass

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
- `npm run build:prod`: 120+ seconds (production build with optimization)
- `npm start`: 120+ seconds (never cancel, takes ~30 seconds to start)
- `npm test`: 60+ seconds (never cancel, takes ~7 seconds)
- `npm run lint`: 30+ seconds (ESLint checking)
- Functions linting: 30+ seconds (never cancel, takes ~5 seconds)
- Functions build: 60+ seconds (TypeScript compilation)
- Functions tests: 60+ seconds (Jest test execution)

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
  - `admin/reviews/`: Review system for pending brewery detections
  - `admin/timeline/`: Timeline management for brewery visits
  - `admin/add-actions/`: Quick action components for common tasks
  - `admin/brewery/`: Brewery management dialogs and components
- `src/app/core/`: Shared modules and services
  - `core/interfaces/`: TypeScript interfaces and types
  - `core/services/`: Shared services for API and data management
  - `core/validators/`: Custom form validators
- `src/environments/`: Firebase configuration (development/production)

### Key Firebase Files  
- `functions/src/index.ts`: Main Firebase Functions entry point
- `functions/src/blastoise.ts`: Data import utilities
- `functions/src/db.ts`: Firestore database connection

### Key Configuration Files
- `.firebaserc`: Firebase project configuration
- `firebase.json`: Firebase hosting and Functions configuration with Node.js 20 runtime
- `ngsw-config.json`: Progressive Web App service worker config
- `angular.json`: Angular CLI configuration for Angular 20
- `.eslintrc.json`: ESLint configuration (TSLint is deprecated)
- `functions/jest.config.js`: Jest testing configuration for Functions

## Known Issues and Workarounds

### Build Issues
1. **Angular Budget Warnings**: The build exceeds size budgets but still succeeds - this is expected
2. **Font Loading Errors**: Development server and builds show font loading errors in sandbox environments
3. **Index.html Generation**: Production builds may fail on index.html generation due to font inlining issues in sandbox

### Testing Issues  
1. **Unit Tests**: Fail due to missing Firebase configuration mocks in test setup
2. **E2E Tests**: Use deprecated Protractor and fail due to network restrictions

### Environment Limitations
1. **Firebase CLI**: Not available in sandbox - cannot deploy or run emulators
2. **Deno**: Not available in sandbox - cannot run location history processing scripts
3. **Network Access**: Limited external API access affects Google Fonts, Maps, and other services
4. **UI Testing**: Limited browser testing capabilities in sandbox environment

## Development Workflow

### Making Changes to Angular Components
1. Run `npm start` to start development server with HMR
2. Make your changes to files in `src/` 
3. Verify changes in browser at localhost:4200
4. Run `npm run lint` to check code style and fix issues with `npm run lint:fix`
5. Run `npm run build:prod` to verify production build works
6. Test key user scenarios manually

### Making Changes to Firebase Functions
1. Make changes to files in `functions/src/`
2. Run `cd functions && npm run lint` to verify linting passes
3. Run `cd functions && npm run build` to verify TypeScript compilation
4. Run `cd functions && npm run test` to run Jest tests
5. Test API endpoints if Firebase CLI becomes available

### Common Development Tasks
- **Add new Angular component**: `ng generate component component-name`
- **Add new service**: `ng generate service service-name`  
- **Update dependencies**: Carefully test builds after updates
- **Firebase deployment**: Requires `firebase deploy` (CLI not available)
- **Bundle analysis**: `npm run analyze` to check bundle size
- **Local emulation**: `npm run serve:local` (requires Firebase CLI)

## Application Architecture

### Frontend (Angular)
- **Framework**: Angular 20 with Material Design and standalone components
- **PWA**: Service worker enabled with offline capabilities and push notifications
- **State Management**: Firebase services for real-time data synchronization
- **Notifications**: Push notifications via Firebase Messaging
- **Routing**: Standalone component routing with lazy loading

### Backend (Firebase)
- **Functions**: Node.js 20 Express.js API endpoints with v6 Firebase Functions SDK
- **Database**: Firestore for brewery and location data with real-time listeners
- **Authentication**: Firebase Auth (configured but minimal usage)
- **Hosting**: Firebase Hosting for static files and PWA deployment
- **Runtime**: Node.js 20 with modern JavaScript features

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

## Recent Project Updates

### Angular 20 Migration
- Upgraded from Angular 13 to Angular 20 with latest features
- Migrated to standalone components architecture
- Updated to ESLint from deprecated TSLint
- Enhanced build system with improved bundling and tree-shaking

### Enhanced Admin Features
- **Reviews System**: New admin component for reviewing pending brewery detections
- **Timeline Management**: Enhanced timeline editing with better UX
- **Quick Actions**: Bottom sheet component for common admin tasks
- **Brewery Management**: Improved brewery addition and editing workflows

### Firebase Functions Improvements
- **Node.js 20 Runtime**: Updated to latest Node.js with better performance
- **v6 Functions SDK**: Latest Firebase Functions SDK with improved APIs
- **Jest Testing**: Comprehensive test suite for Functions
- **Better Error Handling**: Enhanced error handling and logging

### New API Features
- **Automated Approval**: Smart brewery detection with Google search validation
- **Enhanced Notifications**: Improved push notification system
- **Geocoding Services**: Integration with Geocodio for address resolution
- **Timeline Fixes**: Maintenance endpoints for data cleanup

### Development Experience
- **Hot Module Replacement**: Faster development with HMR support
- **Bundle Analysis**: Built-in webpack bundle analyzer
- **Improved Linting**: ESLint with automatic fixes
- **Better Scripts**: Enhanced npm scripts for common tasks