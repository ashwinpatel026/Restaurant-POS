import { Client } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from the project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const masterDbUrl = process.env.MASTER_DATABASE_URL;

if (!masterDbUrl) {
  console.error('❌ MASTER_DATABASE_URL is not set. Please add it to your .env file.');
  process.exit(1);
}

// Tables that need change-detection triggers
const triggerTargets = [
  { table: 'tbl_master_printer', trigger: 'trigger_printer_master_sync' },
  { table: 'tbl_master_menu_master', trigger: 'trigger_menu_master_sync' },
  { table: 'tbl_master_menu_category', trigger: 'trigger_menu_category_sync' },
  { table: 'tbl_master_menu_item', trigger: 'trigger_menu_item_sync' },
  { table: 'tbl_master_modifier_group', trigger: 'trigger_modifier_group_sync' },
  { table: 'tbl_master_modifier_item', trigger: 'trigger_modifier_item_sync' },
  { table: 'tbl_master_prep_zone', trigger: 'trigger_prep_zone_sync' },
  { table: 'tbl_master_station', trigger: 'trigger_station_sync' },
  { table: 'tbl_master_tax', trigger: 'trigger_tax_sync' },
  { table: 'tbl_master_time_events', trigger: 'trigger_time_events_sync' },
];

const triggerFunctionSQL = `
CREATE OR REPLACE FUNCTION log_sync_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO sync_log (table_name, record_id, operation, source, data)
        VALUES (TG_TABLE_NAME, NEW.sync_id, 'INSERT', COALESCE(NEW.sync_source, 'server'), row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO sync_log (table_name, record_id, operation, source, data)
        VALUES (TG_TABLE_NAME, NEW.sync_id, 'UPDATE', COALESCE(NEW.sync_source, 'server'), row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO sync_log (table_name, record_id, operation, source, data)
        VALUES (TG_TABLE_NAME, OLD.sync_id, 'DELETE', COALESCE(OLD.sync_source, 'server'), row_to_json(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
`;

async function createTriggers(client) {
  console.log('\n🔧 Creating log_sync_change() function and triggers on master tables...');
  await client.query('BEGIN');

  try {
    await client.query(triggerFunctionSQL);

    for (const { table, trigger } of triggerTargets) {
      await client.query(`DROP TRIGGER IF EXISTS ${trigger} ON ${table};`);
      await client.query(`
        CREATE TRIGGER ${trigger}
        AFTER INSERT OR UPDATE OR DELETE ON ${table}
        FOR EACH ROW EXECUTE FUNCTION log_sync_change();
      `);
      console.log(`  ✅ ${trigger} attached to ${table}`);
    }

    await client.query('COMMIT');
    console.log('✅ Trigger function and triggers created successfully.\n');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to create triggers:', error.message);
    throw error;
  }
}

async function verifyTriggers(client) {
  const expected = triggerTargets.map(({ trigger }) => trigger);
  const { rows } = await client.query(
    `
      SELECT trigger_name, event_object_table
      FROM information_schema.triggers
      WHERE trigger_schema = current_schema()
        AND trigger_name = ANY($1)
      ORDER BY trigger_name;
    `,
    [expected],
  );

  console.log('🔍 Verification:');
  for (const trigger of expected) {
    const found = rows.find((r) => r.trigger_name === trigger);
    if (found) {
      console.log(`  ✅ ${trigger} exists on ${found.event_object_table}`);
    } else {
      console.log(`  ⚠️  ${trigger} not found`);
    }
  }
}

async function main() {
  console.log('\n════════════════════════════════════════════');
  console.log('  Phase 2: Change-Detection Trigger Installer');
  console.log('════════════════════════════════════════════\n');

  const client = new Client({ connectionString: masterDbUrl });
  await client.connect();
  console.log('✅ Connected to Master DB');

  try {
    await createTriggers(client);
    await verifyTriggers(client);
    console.log('\n🎉 Done. Master tables now log changes into sync_log.');
  } finally {
    await client.end();
    console.log('🔌 Disconnected from Master DB');
  }
}

main().catch((error) => {
  console.error('\n❌ Unhandled error:', error);
  process.exit(1);
});

