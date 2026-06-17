import { getDb } from './client';

async function migrate() {
  const db = getDb();
  
  // Create distribution_settings table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS distribution_settings (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      rate_key varchar(50) NOT NULL,
      rate_value numeric(6, 4) NOT NULL,
      effective_from date NOT NULL,
      effective_to date,
      description varchar(255),
      is_active boolean DEFAULT true NOT NULL,
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL
    )
  `);

  // Create indexes
  await db.execute(`CREATE INDEX IF NOT EXISTS distribution_settings_rate_key_idx ON distribution_settings (rate_key)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS distribution_settings_active_idx ON distribution_settings (is_active)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS distribution_settings_effective_idx ON distribution_settings (effective_from)`);

  console.log('Table created successfully');

  // Seed initial rates if table is empty
  const count = await db.execute(`SELECT COUNT(*)::int as count FROM distribution_settings`);
  const rowCount = (count.rows[0] as any).count;
  
  if (rowCount === 0) {
    await db.execute(`
      INSERT INTO distribution_settings (rate_key, rate_value, effective_from, description, is_active) VALUES
        ('pmg_share', 0.25, '2026-03-01', 'PMG Share: 25% of gross revenue', true),
        ('salary', 0.35, '2026-03-01', 'Salary: 35% of profit pool', true),
        ('reinvest', 0.30, '2026-03-01', 'Reinvestment: 30% of profit pool', true),
        ('reserve', 0.30, '2026-03-01', 'Reserve: 30% of profit pool', true),
        ('flex', 0.05, '2026-03-01', 'Flex: 5% of profit pool', true)
    `);
    console.log('Seeded 5 distribution settings');
  } else {
    console.log(`Table already has ${rowCount} rows, skipping seed`);
  }

  // Verify
  const rows = await db.execute(`SELECT rate_key, rate_value, is_active FROM distribution_settings ORDER BY rate_key`);
  console.log('Current rates:');
  for (const row of rows.rows) {
    const r = row as any;
    console.log(`  ${r.rate_key}: ${r.rate_value} (active: ${r.is_active})`);
  }
}

migrate()
  .then(() => { console.log('Done'); process.exit(0); })
  .catch((e) => { console.error('Migration failed:', e); process.exit(1); });
