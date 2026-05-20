#!/bin/bash
# PayOS Production Build Script
set -e

echo "📦 Installing backend dependencies..."
cd backend && npm install --production=false
cd ..

echo "🎨 Installing frontend dependencies..."
cd frontend && npm install
echo "🔨 Building frontend..."
npm run build
cd ..

echo "✅ Build complete! Frontend dist is at frontend/dist/"
echo "🚀 Start server with: node backend/server.js"
