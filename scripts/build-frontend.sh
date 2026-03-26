#!/bin/bash

# Frontend Build Script for Azure Static Web Apps
# This script replaces API_BASE_URL in config.js with the actual backend URL

set -e

# Get API URL from environment variable or use default
API_URL="${API_BASE_URL:-https://oncall-tracker-api.azurewebsites.net}"

echo "Building frontend with API URL: $API_URL"

# Create config.js with the API URL
cat > frontend/config.js << EOF
// API Configuration
// Auto-generated during build
const API_BASE_URL = '$API_URL';

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.API_BASE_URL = API_BASE_URL;
}
EOF

echo "Frontend configuration updated successfully"

