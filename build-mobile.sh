#!/bin/bash

# Build for mobile - create standalone HTML app
echo "Building mobile app..."

# Create dist directory
mkdir -p dist/static

# Copy index.html
cp index.html dist/

# Copy static assets
cp -r public/static/* dist/static/

# Create a simple _routes.json for static serving
cat > dist/_routes.json << 'ROUTES'
{
  "version": 1,
  "include": ["/*"],
  "exclude": []
}
ROUTES

echo "Mobile build complete! Files in dist/"
ls -la dist/
