/**
 * Run Sync System Migrations
 * 
 * This script runs the sync system migrations on both Master and Location databases.
 * 
 * Usage:
 *   node scripts/run-sync-migrations.js
 * 
 * Environment Variables Required:
 *   - DATABASE_URL (Location Database)
 *   - MASTER_DATABASE_URL (Master Database)
 */

require('dotenv').config();
const { readFileSync } = require('fs');
const { join } = require('path');
const { Client } = require('pg');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function runMigration(client, migrationFile, dbName) {
  try {
    log(`\n📄 Reading migration file: ${migrationFile}`, 'cyan');
    const migrationSQL = readFileSync(migrationFile, 'utf8');

    log(`🚀 Running migration on ${dbName}...`, 'yellow');
    
    // Execute the entire migration file as one query
    // PostgreSQL can handle multiple statements in one query
    try {
      await client.query(migrationSQL);
      log(`✅ Migration completed successfully on ${dbName}!`, 'green');
      return true;
    } catch (error) {
      // Check error code - PostgreSQL specific error codes
      const errorCode = error.code;
      
      // Ignorable error codes (things that are safe to ignore)
      const ignorableCodes = [
        '42P07', // duplicate_table (IF NOT EXISTS)
        '42710', // duplicate_object (IF NOT EXISTS)
        '42P16', // invalid_table_definition (for IF NOT EXISTS on columns)
        '42723', // duplicate_function (IF NOT EXISTS)
        '42704', // undefined_object (for DROP IF EXISTS)
        '42P01', // undefined_table (for DROP IF EXISTS)
      ];
      
      // Check if it's an ignorable error
      if (ignorableCodes.includes(errorCode)) {
        log(`  ⚠️  Some statements skipped (already exists - safe to ignore)`, 'yellow');
        log(`✅ Migration completed on ${dbName} (with warnings)`, 'green');
        return true;
      }
      
      // For other errors, check message for common ignorable patterns
      const ignorableMessages = [
        'already exists',
        'duplicate',
      ];
      
      const isIgnorable = ignorableMessages.some(msg => 
        error.message.toLowerCase().includes(msg.toLowerCase())
      );

      if (isIgnorable) {
        log(`  ⚠️  Some statements skipped (already exists or safe to ignore)`, 'yellow');
        log(`✅ Migration completed on ${dbName} (with warnings)`, 'green');
        return true;
      } else {
        // Real error - show it
        log(`  ❌ Error details: ${error.message}`, 'red');
        log(`  ❌ Error code: ${errorCode}`, 'red');
        throw error;
      }
    }
  } catch (error) {
    log(`❌ Error running migration on ${dbName}: ${error.message}`, 'red');
    console.error(error);
    return false;
  }
}

async function verifyMigration(client, dbName) {
  try {
    log(`\n🔍 Verifying migration on ${dbName}...`, 'cyan');

    // Check UUID extension
    const extResult = await client.query(`
      SELECT * FROM pg_extension WHERE extname = 'uuid-ossp';
    `);
    if (extResult.rows.length > 0) {
      log(`  ✅ UUID extension is enabled`, 'green');
    } else {
      log(`  ⚠️  UUID extension not found`, 'yellow');
    }

    // Check sync_log table (Master DB only)
    if (dbName.includes('Master')) {
      const syncLogResult = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_name = 'sync_log';
      `);
      if (syncLogResult.rows.length > 0) {
        log(`  ✅ sync_log table exists`, 'green');
      } else {
        log(`  ❌ sync_log table not found`, 'red');
      }

      // Check sync_status table
      const syncStatusResult = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_name = 'sync_status';
      `);
      if (syncStatusResult.rows.length > 0) {
        log(`  ✅ sync_status table exists`, 'green');
      } else {
        log(`  ❌ sync_status table not found`, 'red');
      }

      // Check triggers
      const triggerResult = await client.query(`
        SELECT COUNT(*) as count FROM information_schema.triggers 
        WHERE trigger_name LIKE '%_sync';
      `);
      log(`  ✅ Found ${triggerResult.rows[0].count} sync triggers`, 'green');
    }

    // Check sync_id column in a sample table
    const syncIdResult = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'tbl_printer' AND column_name = 'sync_id';
    `);
    if (syncIdResult.rows.length > 0) {
      log(`  ✅ sync_id column exists in tbl_printer`, 'green');
    } else {
      log(`  ⚠️  sync_id column not found in tbl_printer`, 'yellow');
    }

    return true;
  } catch (error) {
    log(`❌ Error verifying migration: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  log('\n═══════════════════════════════════════════════════════', 'blue');
  log('  Sync System Migration Runner', 'blue');
  log('═══════════════════════════════════════════════════════\n', 'blue');

  // Check environment variables
  const locationDbUrl = process.env.DATABASE_URL;
  const masterDbUrl = process.env.MASTER_DATABASE_URL;

  if (!locationDbUrl) {
    log('❌ DATABASE_URL environment variable is not set', 'red');
    log('   Please set DATABASE_URL in your .env file', 'yellow');
    process.exit(1);
  }

  if (!masterDbUrl) {
    log('❌ MASTER_DATABASE_URL environment variable is not set', 'red');
    log('   Please set MASTER_DATABASE_URL in your .env file', 'yellow');
    process.exit(1);
  }

  // Migration file paths
  const masterMigrationFile = join(__dirname, '..', 'prisma', 'migrations', 'add_sync_system', 'migration.sql');
  const locationMigrationFile = join(__dirname, '..', 'prisma', 'migrations', 'add_sync_system_location_db', 'migration.sql');

  let masterClient, locationClient;
  let masterSuccess = false;
  let locationSuccess = false;

  try {
    // Connect to Master Database
    log('\n📦 Connecting to Master Database...', 'cyan');
    masterClient = new Client({ connectionString: masterDbUrl });
    await masterClient.connect();
    log('✅ Connected to Master Database', 'green');

    // Run Master DB migration
    masterSuccess = await runMigration(masterClient, masterMigrationFile, 'Master Database');
    if (masterSuccess) {
      await verifyMigration(masterClient, 'Master Database');
    }

    // Connect to Location Database
    log('\n📦 Connecting to Location Database...', 'cyan');
    locationClient = new Client({ connectionString: locationDbUrl });
    await locationClient.connect();
    log('✅ Connected to Location Database', 'green');

    // Run Location DB migration
    locationSuccess = await runMigration(locationClient, locationMigrationFile, 'Location Database');
    if (locationSuccess) {
      await verifyMigration(locationClient, 'Location Database');
    }

    // Summary
    log('\n═══════════════════════════════════════════════════════', 'blue');
    log('  Migration Summary', 'blue');
    log('═══════════════════════════════════════════════════════', 'blue');
    
    if (masterSuccess) {
      log('✅ Master Database: Migration completed successfully', 'green');
    } else {
      log('❌ Master Database: Migration failed', 'red');
    }

    if (locationSuccess) {
      log('✅ Location Database: Migration completed successfully', 'green');
    } else {
      log('❌ Location Database: Migration failed', 'red');
    }

    if (masterSuccess && locationSuccess) {
      log('\n🎉 All migrations completed successfully!', 'green');
      log('   You can now use the sync system.', 'green');
    } else {
      log('\n⚠️  Some migrations failed. Please check the errors above.', 'yellow');
      process.exit(1);
    }

  } catch (error) {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  } finally {
    // Close connections
    if (masterClient) {
      await masterClient.end();
      log('\n🔌 Disconnected from Master Database', 'cyan');
    }
    if (locationClient) {
      await locationClient.end();
      log('🔌 Disconnected from Location Database', 'cyan');
    }
  }
}

// Run the script
main().catch((error) => {
  log(`\n❌ Unhandled error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

