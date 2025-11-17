#!/bin/bash

# APD OASIS - Cloudflare Pages Deployment Script
# This script builds and deploys the application to Cloudflare Pages

set -e  # Exit on error

echo "🚀 Starting deployment process..."
echo ""

# Check if CLOUDFLARE_API_TOKEN is set
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "❌ Error: CLOUDFLARE_API_TOKEN is not set"
    echo "Please set it with: export CLOUDFLARE_API_TOKEN='your-token-here'"
    exit 1
fi

# Build the application
echo "📦 Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build completed successfully"
echo ""

# Deploy to Cloudflare Pages
echo "☁️  Deploying to Cloudflare Pages..."
npx wrangler pages deploy dist --project-name=apd-oasis --branch=main

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed!"
    exit 1
fi

echo ""
echo "✅ Deployment completed successfully!"
echo "🌐 Your app is live at: https://apd-oasis.pages.dev"
echo ""
