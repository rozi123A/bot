#!/bin/bash
# Build script for Render

echo "📦 Installing server dependencies..."
cd server && npm install

echo "📦 Installing client dependencies (including devDependencies)..."
cd ../client && npm install --include=dev

echo "🔨 Building client with npx..."
npx vite build

echo "✅ Build complete!"