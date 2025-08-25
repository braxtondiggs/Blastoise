# Blastoise ![Blastoise](cryptonym.png)

A brewery tracking Progressive Web Application (PWA) that tracks and displays whether someone named "Braxton" is currently at a brewery location. Built with Angular 20, Firebase, and advanced location processing capabilities.

## Features

- **Real-time Brewery Tracking**: Shows current brewery status with live location updates
- **Progressive Web App**: Installable PWA with offline capabilities and push notifications
- **Admin Dashboard**: Comprehensive admin interface for managing breweries and reviewing location data
- **Automated Detection**: Smart brewery detection using Google location data and automatic approval system
- **Timeline Management**: Detailed visit timelines with start/end times and duration tracking
- **Push Notifications**: Real-time notifications when brewery visits are detected
- **Google Maps Integration**: Interactive maps showing brewery locations and visit history

## Architecture

### Frontend (Angular 20 PWA)
- **Framework**: Angular 20 with Angular Material design
- **PWA Features**: Service worker, offline support, installable app
- **Real-time Updates**: Firebase integration for live data synchronization
- **Responsive Design**: Mobile-first design optimized for all devices

### Backend (Firebase)
- **Functions**: Node.js 20 serverless functions for API endpoints
- **Database**: Firestore for real-time brewery and location data
- **Authentication**: Firebase Auth for secure admin access
- **Hosting**: Firebase Hosting for static assets and PWA deployment

### Data Processing (Deno)
- **Location History**: Scripts to process Google Location History JSON files
- **Brewery Detection**: Automated brewery identification and visit tracking
- **Data Condensation**: Efficient location data compression and storage

## Quick Start

### Prerequisites
- Node.js v20+
- npm v10+
- Firebase CLI (for deployment)

### Installation & Development

```bash
# Clone the repository
git clone https://github.com/braxtondiggs/Blastoise.git
cd Blastoise

# Install dependencies
npm install

# Install Firebase Functions dependencies
cd functions && npm install && cd ..

# Start development server
npm start
# Navigate to http://localhost:4200/
```

### Build & Deploy

```bash
# Build for production
npm run build:prod

# Deploy to Firebase
npm run deploy

# Deploy only functions
npm run deploy:functions
```

### Development Commands

```bash
# Development server with HMR
npm start

# Build for production
npm run build:prod

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Analyze bundle size
npm run analyze

# Run Firebase emulators
npm run serve:local
```

### Firebase Functions

```bash
cd functions

# Lint Functions code
npm run lint

# Build Functions
npm run build

# Run tests
npm run test

# Deploy Functions only
npm run deploy
```

## Project Structure

```
├── src/                    # Angular application source
│   ├── app/
│   │   ├── home/          # Main brewery status component
│   │   ├── admin/         # Admin dashboard and management
│   │   └── core/          # Shared services and interfaces
│   ├── environments/      # Environment configurations
│   └── assets/           # Static assets
├── functions/             # Firebase Functions backend
│   ├── src/
│   │   ├── index.ts      # Main Functions entry point
│   │   ├── blastoise.ts  # Data processing utilities
│   │   └── db.ts         # Database connection
├── deno/                 # Deno scripts for location processing
│   ├── src/
│   │   ├── condense.ts   # Location data compression
│   │   └── search.ts     # Brewery visit detection
└── dist/                 # Build output
```

## Key Features & Components

### Home Component
- Real-time brewery status display
- Google Maps integration
- Visit duration and timing information
- Push notification controls

### Admin Dashboard
- Brewery management and approval system
- Visit timeline editing and management
- Review pending brewery detections
- Quick action tools for common tasks

### Automated Detection System
- Google location history processing
- Intelligent brewery identification using web scraping
- Automatic approval for known brewery locations
- Manual review system for uncertain detections

## API Endpoints

The Firebase Functions provide several API endpoints:

- `POST /notification` - Send push notifications
- `POST /geocodio` - Reverse geocoding services
- `GET /fix-brewery-timestamps` - Maintenance endpoint for data cleanup

## Development Notes

- The application uses Angular 20 with standalone components
- Firebase v6 functions with Node.js 20 runtime
- ESLint for code linting (TSLint is deprecated)
- Jest for testing Firebase Functions
- Material Design with custom theming

## Deployment

The application is deployed to Firebase Hosting with automatic builds via GitHub Actions. Firebase Functions handle the backend API and real-time data processing.

Live application: https://braxton.beer

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is private and not open for public contribution.
