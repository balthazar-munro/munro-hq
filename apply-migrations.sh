#!/bin/bash

# Supabase Migration Script
# This script applies all migrations to your Supabase project

set -e  # Exit on error

echo "🚀 Munro HQ - Supabase Migration Runner"
echo "========================================"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo ""
    echo "❌ Supabase CLI not found!"
    echo ""
    echo "Install it first:"
    echo "  macOS:   brew install supabase/tap/supabase"
    echo "  Windows: scoop bucket add supabase https://github.com/supabase/scoop-bucket.git && scoop install supabase"
    echo "  Linux:   See https://supabase.com/docs/guides/cli/getting-started"
    echo ""
    exit 1
fi

echo ""
echo "✅ Supabase CLI found: $(supabase --version)"
echo ""

# Check if project is linked
if [ ! -f ".supabase/config.toml" ]; then
    echo "⚠️  Project not linked to Supabase"
    echo ""
    echo "Link your project first:"
    echo "  cd app && supabase link --project-ref YOUR_PROJECT_REF"
    echo ""
    echo "Get your project ref from:"
    echo "  https://supabase.com/dashboard/project/YOUR_PROJECT/settings/general"
    echo ""
    exit 1
fi

cd app

echo "📋 Migrations to apply:"
echo ""
ls -1 supabase/migrations/*.sql | nl
echo ""

read -p "Apply all migrations? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled"
    exit 0
fi

echo ""
echo "🔄 Applying migrations..."
echo ""

# Apply migrations
supabase db push

echo ""
echo "✅ Migrations applied!"
echo ""
echo "🔍 Verifying setup..."
echo ""

# Verify critical objects exist
supabase db execute --query "
SELECT
  'profiles_safe view' as object_type,
  EXISTS(SELECT 1 FROM pg_views WHERE viewname = 'profiles_safe') as exists
UNION ALL
SELECT
  'claim_my_identity function',
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'claim_my_identity')
UNION ALL
SELECT
  'verify_pin function',
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'verify_pin')
UNION ALL
SELECT
  'set_pin function',
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'set_pin');
"

echo ""
echo "✅ All done! Your Supabase database is ready."
echo ""
echo "Next steps:"
echo "  1. Deploy to Vercel (should build successfully now)"
echo "  2. Follow SETUP.md to create family accounts"
echo ""
