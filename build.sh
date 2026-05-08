#!/bin/bash
# Build script for Render

echo "📦 Installing server dependencies..."
cd server && npm install

echo "📦 Installing client dependencies..."
cd ../client && npm install

echo "🔨 Building client..."
npm run build

echo "✅ Build complete!"