#!/bin/bash

# Quick deployment script for APD OASIS
# Usage: ./quick-deploy.sh YOUR_CLOUDFLARE_API_TOKEN

if [ -z "$1" ]; then
    echo "❌ Error: Please provide Cloudflare API token as argument"
    echo ""
    echo "Usage: ./quick-deploy.sh YOUR_CLOUDFLARE_API_TOKEN"
    echo ""
    echo "Or set it as environment variable:"
    echo "export CLOUDFLARE_API_TOKEN='your-token-here'"
    echo "./quick-deploy.sh"
    exit 1
fi

export CLOUDFLARE_API_TOKEN="$1"

echo "🚀 Starting deployment process..."
echo ""

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
echo "🌐 Your app should be live at: https://apd-oasis.pages.dev"
echo ""
