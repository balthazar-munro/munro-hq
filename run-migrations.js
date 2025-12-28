#!/usr/bin/env node

/**
 * Supabase Migration Runner
 *
 * This script runs all pending migrations in order.
 *
 * Usage:
 *   node run-migrations.js
 *
 * Requirements:
 *   - NEXT_PUBLIC_SUPABASE_URL environment variable
 *   - SUPABASE_SERVICE_ROLE_KEY environment variable (for migrations)
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables!')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  console.error('\nSet them in your .env.local file or export them:')
  console.error('  export NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"')
  console.error('  export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"')
  process.exit(1)
}

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const MIGRATIONS_DIR = join(__dirname, 'supabase', 'migrations')

async function runMigration(filename) {
  console.log(`\n📄 Running migration: ${filename}`)

  const filePath = join(MIGRATIONS_DIR, filename)
  const sql = readFileSync(filePath, 'utf8')

  try {
    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      // If exec_sql doesn't exist, try direct execution
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`
        },
        body: JSON.stringify({ sql_query: sql })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }
    }

    console.log(`✅ ${filename} completed`)
    return true
  } catch (err) {
    console.error(`❌ ${filename} failed:`, err.message)
    return false
  }
}

async function verifySetup() {
  console.log('\n🔍 Verifying migration results...\n')

  const checks = [
    {
      name: 'profiles_safe view',
      sql: "SELECT EXISTS(SELECT 1 FROM pg_views WHERE viewname = 'profiles_safe') as exists"
    },
    {
      name: 'claim_my_identity function',
      sql: "SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'claim_my_identity') as exists"
    },
    {
      name: 'verify_pin function',
      sql: "SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'verify_pin') as exists"
    },
    {
      name: 'set_pin function',
      sql: "SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'set_pin') as exists"
    }
  ]

  for (const check of checks) {
    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: check.sql })
      const exists = data?.[0]?.exists || false
      console.log(`${exists ? '✅' : '❌'} ${check.name}`)
    } catch (err) {
      console.log(`⚠️  ${check.name} - Unable to verify`)
    }
  }
}

async function main() {
  console.log('🚀 Supabase Migration Runner')
  console.log(`📍 Supabase URL: ${supabaseUrl}`)
  console.log(`📁 Migrations directory: ${MIGRATIONS_DIR}`)

  // Get all migration files
  const files = readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort()

  console.log(`\n📋 Found ${files.length} migration files`)

  let successCount = 0

  for (const file of files) {
    const success = await runMigration(file)
    if (success) successCount++
  }

  console.log(`\n📊 Summary: ${successCount}/${files.length} migrations completed`)

  if (successCount === files.length) {
    await verifySetup()
    console.log('\n✅ All migrations completed successfully!')
  } else {
    console.log('\n⚠️  Some migrations failed. Check the errors above.')
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
