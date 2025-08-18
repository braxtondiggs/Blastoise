# Deployment Strategy Documentation

## Overview

This document outlines the simplified CI/CD deployment strategy for the Blastoise brewery tracking application. The strategy focuses on a single production environment with automated quality checks and robust deployment pipeline.

## Architecture

### Single Production Environment

- **Production** (`master` branch only)
  - Live application available to users
  - Full optimizations enabled
  - Source maps disabled for security
  - Service worker enabled for PWA functionality
  - Firebase Functions deployment included
  - Triggered only by pushes to master branch

## Workflows

### Main CI/CD Pipeline (`main.yml`)

**Triggers:**
- Push to `master` branch only
- Manual workflow dispatch

**Jobs:**

1. **Quality Checks**
   - Dependency caching for faster builds
   - Firebase Functions linting (Angular linting skipped due to TSLint deprecation)
   - Unit tests (with fallback for current Firebase mock issues)
   - Security audits (npm audit for vulnerabilities)

2. **Build and Deploy**
   - Production-optimized Angular build
   - Firebase Functions compilation
   - Direct deployment to Firebase Hosting and Functions
   - Deployment status tracking

### Dependency Management (`dependencies.yml`)

**Triggers:**
- Weekly schedule (Mondays at 8 AM UTC)
- Manual dispatch

**Features:**
- Automated dependency checking
- Security audit reports
- GitHub issue creation for updates
- Update instructions and recommendations

## Required Secrets

Add these secrets to your GitHub repository settings:

### Firebase Authentication
- `GOOGLE_APPLICATION_CREDENTIALS`: Service account JSON file content for Firebase authentication
- `FIREBASE_SERVICE_ACCOUNT`: Service account JSON for Firebase hosting
- `FIREBASE_PROJECT_ID`: Your Firebase project ID

### GitHub
- `GITHUB_TOKEN`: Automatically provided by GitHub Actions

## Setup Instructions

### 1. Firebase Project Setup

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize project (if not already done)
firebase init

# Create a service account for GitHub Actions
# 1. Go to Firebase Console > Project Settings > Service Accounts
# 2. Generate new private key and download JSON file
# 3. Copy the entire JSON file content for GOOGLE_APPLICATION_CREDENTIALS secret
```

### 2. GitHub Secrets Configuration

1. Go to your repository Settings → Secrets and variables → Actions
2. Add the required secrets listed above:
   - `GOOGLE_APPLICATION_CREDENTIALS`: Paste the entire service account JSON file content
   - `FIREBASE_SERVICE_ACCOUNT`: Same service account JSON for hosting deployments
   - `FIREBASE_PROJECT_ID`: Your Firebase project ID
3. Ensure the service account has necessary permissions:
   - Firebase Hosting Admin
   - Cloud Functions Developer
   - Service Account User

### 3. Environment Configuration

Update the production environment file with your Firebase config:
- `src/environments/environment.prod.ts` - Production config

## Deployment Process

### Automatic Deployment

Push to the `master` branch to trigger automatic deployment:

```bash
git checkout master
git merge your-feature-branch
git push origin master
```

### Manual Deployment

#### Using GitHub Actions
1. Go to Actions tab in your repository
2. Select "CI/CD Pipeline" workflow
3. Click "Run workflow"
4. Choose master branch and click "Run workflow"

#### Using Local Script
```bash
# Full production deployment
./deploy.sh

# Deploy without rebuilding
./deploy.sh --skip-build

# Preview what would be deployed
./deploy.sh --dry-run

# Deploy only hosting (skip functions)
./deploy.sh --skip-functions
```

#### Using npm Scripts
```bash
# Full deployment (build + deploy)
npm run deploy

# Deploy only functions
npm run deploy:functions

# Build for production
npm run build:prod
```

### Local Development

```bash
# Install dependencies
npm install
cd functions && npm install && cd ..

# Start development server
npm start

# Build for production
npm run build:prod

# Test functions locally with emulators
npm run serve:local
```

## Monitoring and Troubleshooting

### Build Status

Monitor deployments in the Actions tab of your GitHub repository. The workflow provides detailed logs for troubleshooting.

### Common Issues

1. **Functions Build Failures**: Currently experiencing TypeScript compatibility issues with `@types/ws`. This is a known issue documented in the instructions.

2. **Test Failures**: Unit tests may fail due to missing Firebase configuration mocks. This is expected and doesn't block deployment.

3. **Lint Errors**: Main Angular linting is skipped due to TSLint deprecation. Functions linting must pass.

4. **Budget Warnings**: Angular builds may show budget warnings - these are expected and don't fail the build.

### Rollback Strategy

If a deployment fails or causes issues:

1. **Immediate**: Revert the commit and push to trigger a new deployment
2. **Firebase Console**: Use Firebase Console to restore a previous hosting version
3. **Manual Deploy**: Use local Firebase CLI to deploy a known good build

```bash
# Quick rollback using local deployment
git revert HEAD
git push origin master
# Or deploy manually:
./deploy.sh
```

## Performance Optimizations

### Caching Strategy

1. **Dependencies**: npm cache is used to speed up installs
2. **Static Assets**: Aggressive caching for hashed assets (1 year)
3. **Images and Fonts**: 1-day cache for better loading performance

### Build Optimizations

1. **Production builds**: Full Angular optimizations enabled
2. **Chunking**: Vendor chunk separation for better caching
3. **Compression**: Automatic asset optimization
4. **Tree Shaking**: Unused code elimination

## Security Considerations

### Source Maps

- **Production**: Disabled for security (prevents source code exposure)
- **Development**: Available locally for debugging

### Dependencies

- **Automated Audits**: Weekly security audits with npm audit
- **Vulnerability Tracking**: Issues created for security updates
- **Update Monitoring**: Regular dependency update checks

### Access Control

- **GitHub Protection**: Master branch can be protected with review requirements
- **Secret Management**: All sensitive data stored in GitHub Secrets
- **Service Accounts**: Minimal required permissions for Firebase service accounts

## Available Commands

### npm Scripts
- `npm start` - Start development server
- `npm run build` - Build for development
- `npm run build:prod` - Build for production
- `npm run test` - Run unit tests
- `npm run test:ci` - Run tests in CI mode
- `npm run deploy` - Build and deploy to production
- `npm run deploy:functions` - Deploy only Firebase Functions
- `npm run serve:local` - Start Firebase emulators
- `npm run analyze` - Analyze bundle size

### Deployment Script Options
- `./deploy.sh` - Full production deployment
- `./deploy.sh --skip-build` - Deploy without rebuilding
- `./deploy.sh --skip-functions` - Deploy only hosting
- `./deploy.sh --dry-run` - Preview deployment without deploying
- `./deploy.sh --help` - Show help message

## Future Enhancements

### Planned Improvements

1. **Performance Monitoring**: Integration with Firebase Performance Monitoring
2. **Error Tracking**: Integration with error tracking services
3. **Automated Testing**: Expanded test coverage and E2E testing
4. **Feature Flags**: Environment-based feature toggling
5. **Progressive Deployment**: Gradual rollout strategies

### Metrics and Analytics

1. **Build Times**: Monitor and optimize CI/CD performance
2. **Deployment Success Rate**: Track deployment reliability
3. **Test Coverage**: Improve and monitor test coverage
4. **Bundle Size**: Monitor and optimize application bundle sizes

This simplified deployment strategy provides a robust foundation for the Blastoise application while maintaining simplicity and reliability.
