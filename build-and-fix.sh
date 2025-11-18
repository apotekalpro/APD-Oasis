#!/bin/bash
# Build and fix _routes.json for proper static file serving

echo "🔨 Building project..."
npm run build

echo "🔧 Fixing _routes.json..."
cat > dist/_routes.json << 'ROUTES'
{
  "version": 1,
  "include": ["/api/*"],
  "exclude": ["/static/*", "/", "/index.html"]
}
ROUTES

echo "✅ Build complete with correct routing configuration!"
echo ""
echo "📁 dist/_routes.json:"
cat dist/_routes.json
