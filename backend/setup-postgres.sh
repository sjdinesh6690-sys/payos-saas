#!/bin/bash
# PayOS — PostgreSQL Setup Script
# Run this once to create the database, migrate data, and start the server.

set -e  # Stop on any error

echo ""
echo "╔═══════════════════════════════════════╗"
echo "║   PayOS PostgreSQL Setup              ║"
echo "╚═══════════════════════════════════════╝"
echo ""

# Move to the backend directory (works wherever you run this from)
cd "$(dirname "$0")"

# ── Step 1: Create the database ──────────────────────────────────────────────
echo "📦 Step 1: Creating PostgreSQL database 'payos_db'..."
psql -U postgres -c "CREATE DATABASE payos_db;" 2>/dev/null \
  && echo "   ✅ Database created." \
  || echo "   ℹ️  Database already exists — skipping."

echo ""

# ── Step 2: Run migration ────────────────────────────────────────────────────
echo "📤 Step 2: Migrating existing data..."
node migrate.js

echo ""

# ── Step 3: Start the backend server ────────────────────────────────────────
echo "🚀 Step 3: Starting PayOS backend on port 3001..."
echo "   (Press Ctrl+C to stop)"
echo ""
node server.js
