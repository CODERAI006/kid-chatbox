/**
 * Dynamic PostgreSQL schema discovery via information_schema.
 */

const { setRegistry, getRegistry } = require('./schemaRegistry');

async function discoverSchema(client) {
  if (!client || typeof client.query !== 'function') {
    throw new Error('discoverSchema requires a pg client or pool');
  }
  const tablesResult = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  const columnsResult = await client.query(`
    SELECT
      c.table_name,
      c.column_name,
      c.data_type,
      c.is_nullable,
      CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END AS is_primary_key
    FROM information_schema.columns c
    LEFT JOIN (
      SELECT kcu.table_name, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
    ) pk ON pk.table_name = c.table_name AND pk.column_name = c.column_name
    WHERE c.table_schema = 'public'
    ORDER BY c.table_name, c.ordinal_position
  `);

  const fkResult = await client.query(`
    SELECT
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
     AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
  `);

  const columnsByTable = new Map();
  for (const row of columnsResult.rows) {
    if (!columnsByTable.has(row.table_name)) {
      columnsByTable.set(row.table_name, []);
    }
    columnsByTable.get(row.table_name).push({
      name: row.column_name,
      dataType: row.data_type,
      isNullable: row.is_nullable === 'YES',
      isPrimaryKey: row.is_primary_key,
    });
  }

  const fkByTable = new Map();
  for (const row of fkResult.rows) {
    if (!fkByTable.has(row.table_name)) {
      fkByTable.set(row.table_name, []);
    }
    fkByTable.get(row.table_name).push({
      table: row.table_name,
      column: row.column_name,
      foreignTable: row.foreign_table_name,
      foreignColumn: row.foreign_column_name,
    });
  }

  const tables = tablesResult.rows.map((row) => ({
    name: row.table_name,
    columns: columnsByTable.get(row.table_name) || [],
    foreignKeys: fkByTable.get(row.table_name) || [],
    purposes: [],
  }));

  setRegistry(tables);
  return getRegistry();
}

async function initializeSchemaRegistry(pool) {
  try {
    const reg = await discoverSchema(pool);
    console.info(
      `[SchemaRegistry] Loaded ${reg.tables.length} tables at ${reg.loadedAt}`
    );
    return reg;
  } catch (err) {
    console.error('[SchemaRegistry] Discovery failed:', err.message || err);
    return null;
  }
}

module.exports = { discoverSchema, initializeSchemaRegistry };
