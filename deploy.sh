#!/bin/bash

# Blastoise Production Deployment Script
# Usage: ./deploy.sh [options]

set -e
set -u
set -o pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
SKIP_BUILD=false
SKIP_FUNCTIONS=false
DRY_RUN=false

# Function to display usage
usage() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --skip-build      Skip the Angular build step"
    echo "  --skip-functions  Skip Firebase Functions deployment"
    echo "  --dry-run         Show what would be deployed without deploying"
    echo "  --help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                           # Full production deployment"
    echo "  $0 --skip-build             # Deploy without rebuilding"
    echo "  $0 --dry-run                # Preview deployment"
    echo "  $0 --skip-functions         # Deploy only hosting"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-functions)
            SKIP_FUNCTIONS=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help)
            usage
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            usage
            exit 1
            ;;
    esac
done

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if Firebase CLI is installed
    if ! command -v firebase &> /dev/null; then
        print_error "Firebase CLI is not installed. Please install it with: npm install -g firebase-tools"
        exit 1
    fi
    
    # Check if logged in to Firebase
    if ! firebase projects:list &> /dev/null; then
        print_error "Not logged in to Firebase. Please run: firebase login"
        exit 1
    fi
    
    # Check if Node.js dependencies are installed
    if [ ! -d "node_modules" ]; then
        print_warning "Node modules not found. Installing dependencies..."
        npm install
    fi
    
    # Check Firebase Functions dependencies
    if [ ! -d "functions/node_modules" ]; then
        print_warning "Firebase Functions modules not found. Installing dependencies..."
        cd functions && npm install && cd ..
    fi
    
    print_success "Prerequisites check completed"
}

# Function to build the application
build_application() {
    if [ "$SKIP_BUILD" = true ]; then
        print_warning "Skipping build step"
        return
    fi
    
    print_status "Building application for production..."
    npm run build:prod
    print_success "Build completed successfully"
}

# Function to deploy to Firebase
deploy_to_firebase() {
    if [ "$DRY_RUN" = true ]; then
        print_warning "DRY RUN: Would deploy to Firebase production"
        print_status "Firebase hosting would be deployed"
        if [ "$SKIP_FUNCTIONS" != true ]; then
            print_status "Firebase Functions would be deployed"
        fi
        return
    fi
    
    print_status "Deploying to Firebase production..."
    
    # Deploy hosting
    firebase deploy --only hosting
    
    # Deploy functions
    if [ "$SKIP_FUNCTIONS" != true ]; then
        print_status "Deploying Firebase Functions..."
        firebase deploy --only functions
    else
        print_warning "Skipping Firebase Functions deployment"
    fi
    
    print_success "Firebase deployment completed"
}

# Function to display deployment summary
show_summary() {
    echo ""
    echo "=================================="
    echo "       DEPLOYMENT SUMMARY"
    echo "=================================="
    echo "Environment: Production"
    echo "Build skipped: $SKIP_BUILD"
    echo "Functions skipped: $SKIP_FUNCTIONS"
    echo "Dry run: $DRY_RUN"
    echo "=================================="
    
    if [ "$DRY_RUN" != true ]; then
        print_success "Production deployment completed successfully!"
        echo ""
        echo "Next steps:"
        echo "- Test the live application"
        echo "- Monitor for any issues"
        echo "- Check Firebase Console for deployment details"
    else
        print_status "This was a dry run - no actual deployment occurred"
    fi
}

# Main execution
main() {
    echo ""
    echo "🚀 Blastoise Production Deployment"
    echo "=================================="
    echo ""
    
    check_prerequisites
    build_application
    deploy_to_firebase
    show_summary
}

# Run main function
main
