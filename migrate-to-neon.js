/**
 * One-time migration script: Render PostgreSQL → Neon
 * Run from repo root: node migrate-to-neon.js
 */

const { Client } = require('pg');

const RENDER_URL = 'postgresql://dcalog_db_user:JatSWfYP9nGRBv1AnPKuFmajcaXWUlox@dpg-d84a3egjo89c73an2ntg-a.frankfurt-postgres.render.com/dcalog_db';
const NEON_URL   = 'postgresql://neondb_owner:npg_d1eg2yLxWfrk@ep-small-pine-algvztpp.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require';

async function migrate() {
  const src  = new Client({ connectionString: RENDER_URL, ssl: { rejectUnauthorized: false } });
  const dest = new Client({ connectionString: NEON_URL,   ssl: { rejectUnauthorized: false } });

  await src.connect();
  await dest.connect();
  console.log('✓ Connected to both databases');

  // 1. Get all table names
  const { rows: tables } = await src.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);
  console.log(`✓ Found ${tables.length} tables:`, tables.map(t => t.tablename).join(', '));

  // 2. Export schema from source (get CREATE TABLE statements via information_schema)
  //    We'll copy structure by reading from source and writing to dest table-by-table.
  //    First, get the schema DDL by querying pg_dump equivalent via SQL.

  // Get column definitions for each table
  const { rows: columns } = await src.query(`
    SELECT
      table_name,
      column_name,
      data_type,
      character_maximum_length,
      is_nullable,
      column_default,
      ordinal_position
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `);

  // Get primary keys
  const { rows: pkeys } = await src.query(`
    SELECT tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'PRIMARY KEY'
      AND tc.table_schema = 'public'
  `);

  const pkMap = {};
  for (const { table_name, column_name } of pkeys) {
    if (!pkMap[table_name]) pkMap[table_name] = [];
    pkMap[table_name].push(column_name);
  }

  // Get sequences/enums
  const { rows: enums } = await src.query(`
    SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder) AS labels
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    GROUP BY t.typname
  `);

  // 3. Recreate enums on dest
  for (const { typname, labels } of enums) {
    const labelList = labels.map(l => `'${l}'`).join(', ');
    try {
      await dest.query(`CREATE TYPE "${typname}" AS ENUM (${labelList})`);
      console.log(`  ✓ Created enum: ${typname}`);
    } catch (e) {
      if (e.code === '42710') console.log(`  ~ Enum already exists: ${typname}`);
      else throw e;
    }
  }

  // 4. Get full schema dump using pg_dump-style reconstruction
  //    Group columns by table
  const tableColumns = {};
  for (const col of columns) {
    if (!tableColumns[col.table_name]) tableColumns[col.table_name] = [];
    tableColumns[col.table_name].push(col);
  }

  // Get foreign keys
  const { rows: fkeys } = await src.query(`
    SELECT
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      tc.constraint_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
  `);

  // 5. Recreate tables (without FK constraints first)
  for (const { tablename } of tables) {
    const cols = tableColumns[tablename] || [];
    const colDefs = cols.map(col => {
      let type = col.data_type;
      if (type === 'character varying') type = col.character_maximum_length ? `varchar(${col.character_maximum_length})` : 'varchar';
      if (type === 'USER-DEFINED') {
        // enum — get the actual type name
        type = col.udt_name || type;
      }

      let def = `"${col.column_name}" ${type}`;
      if (col.column_default) def += ` DEFAULT ${col.column_default}`;
      if (col.is_nullable === 'NO') def += ' NOT NULL';
      return def;
    });

    const pks = pkMap[tablename] || [];
    if (pks.length) colDefs.push(`PRIMARY KEY (${pks.map(c => `"${c}"`).join(', ')})`);

    const ddl = `CREATE TABLE IF NOT EXISTS "${tablename}" (\n  ${colDefs.join(',\n  ')}\n)`;
    try {
      await dest.query(ddl);
      console.log(`  ✓ Created table: ${tablename}`);
    } catch (e) {
      console.error(`  ✗ Failed to create table ${tablename}:`, e.message);
      console.error('DDL was:', ddl);
      throw e;
    }
  }

  // 6. Copy data table by table
  for (const { tablename } of tables) {
    const { rows: data } = await src.query(`SELECT * FROM "${tablename}"`);
    if (data.length === 0) {
      console.log(`  ~ No data in ${tablename}, skipping`);
      continue;
    }

    const cols = Object.keys(data[0]).map(c => `"${c}"`).join(', ');
    let inserted = 0;

    for (const row of data) {
      const values = Object.values(row);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      try {
        await dest.query(
          `INSERT INTO "${tablename}" (${cols}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
          values
        );
        inserted++;
      } catch (e) {
        console.error(`  ✗ Row insert failed in ${tablename}:`, e.message, JSON.stringify(row).slice(0, 100));
      }
    }
    console.log(`  ✓ Copied ${inserted}/${data.length} rows → ${tablename}`);
  }

  // 7. Add foreign key constraints
  for (const fk of fkeys) {
    const sql = `ALTER TABLE "${fk.table_name}" ADD CONSTRAINT "${fk.constraint_name}" FOREIGN KEY ("${fk.column_name}") REFERENCES "${fk.foreign_table_name}" ("${fk.foreign_column_name}")`;
    try {
      await dest.query(sql);
      console.log(`  ✓ FK: ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    } catch (e) {
      if (e.code === '42710' || e.code === '42P07') console.log(`  ~ FK already exists: ${fk.constraint_name}`);
      else console.warn(`  ~ FK skipped (${fk.constraint_name}):`, e.message);
    }
  }

  // 8. Reset sequences so auto-increment continues correctly
  const { rows: seqs } = await src.query(`
    SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'
  `);
  for (const { sequence_name } of seqs) {
    const { rows: [{ last_value }] } = await src.query(`SELECT last_value FROM "${sequence_name}"`);
    try {
      await dest.query(`SELECT setval('"${sequence_name}"', $1, true)`, [last_value]);
      console.log(`  ✓ Sequence ${sequence_name} reset to ${last_value}`);
    } catch (e) {
      console.warn(`  ~ Could not reset sequence ${sequence_name}:`, e.message);
    }
  }

  await src.end();
  await dest.end();
  console.log('\n🎉 Migration complete!');
}

migrate().catch(err => {
  console.error('\n❌ Migration failed:', err.message);
  process.exit(1);
});
