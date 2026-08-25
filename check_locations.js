import postgres from 'postgres';
const sql = postgres('postgresql://postgres:postgres@localhost:5433/vat_expense');

(async () => {
  // 1. Preview: what will be updated
  const preview = await sql`
    WITH party_mode_location AS (
      SELECT DISTINCT ON (e.party_id)
        e.party_id,
        e.location_id AS best_location_id,
        l.name AS best_location_name,
        COUNT(*)::int AS frequency
      FROM expenses e
      JOIN parties p ON p.id = e.party_id
      JOIN locations l ON l.id = e.location_id
      WHERE e.is_deleted = false
        AND p.location_id IS NULL
        AND e.location_id IS NOT NULL
      GROUP BY e.party_id, e.location_id, l.name
      ORDER BY e.party_id, frequency DESC
    )
    SELECT 
      p.name AS party_name,
      pml.best_location_name,
      pml.frequency
    FROM party_mode_location pml
    JOIN parties p ON p.id = pml.party_id
    ORDER BY pml.frequency DESC
  `;
  console.log('=== WILL UPDATE THESE PARTIES ===');
  for (const r of preview) {
    console.log(`  ${r.party_name} -> "${r.best_location_name}" (${r.frequency} expenses)`);
  }

  // 2. Execute the backfill
  const result = await sql`
    UPDATE parties p
    SET location_id = sub.best_location_id,
        updated_at = now()
    FROM (
      SELECT DISTINCT ON (e.party_id)
        e.party_id,
        e.location_id AS best_location_id,
        COUNT(*)::int AS frequency
      FROM expenses e
      JOIN parties p2 ON p2.id = e.party_id
      WHERE e.is_deleted = false
        AND p2.location_id IS NULL
        AND e.location_id IS NOT NULL
      GROUP BY e.party_id, e.location_id
      ORDER BY e.party_id, frequency DESC
    ) sub
    WHERE p.id = sub.party_id
      AND p.location_id IS NULL
  `;
  console.log(`\n=== BACKFILL COMPLETE: ${result.count} parties updated ===`);

  // 3. Verify: check remaining parties without location
  const remaining = await sql`
    SELECT 
      p.name AS party_name,
      COUNT(e.id)::int AS expense_count
    FROM parties p
    LEFT JOIN expenses e ON e.party_id = p.id AND e.is_deleted = false
    WHERE p.location_id IS NULL
      AND p.is_active = true
    GROUP BY p.name
    HAVING COUNT(e.id) > 0
    ORDER BY expense_count DESC
  `;
  console.log('\n=== REMAINING PARTIES WITHOUT LOCATION (active, with expenses) ===');
  if (remaining.length === 0) {
    console.log('  None — all parties with expenses now have a location!');
  } else {
    for (const r of remaining) {
      console.log(`  ${r.party_name}: ${r.expense_count} expenses, no location in any expense`);
    }
  }

  // 4. Final stats
  const stats = await sql`
    SELECT
      COUNT(*)::int AS total_active_parties,
      COUNT(*) FILTER (WHERE location_id IS NOT NULL)::int AS with_location,
      COUNT(*) FILTER (WHERE location_id IS NULL)::int AS without_location
    FROM parties
    WHERE is_active = true
  `;
  console.log('\n=== FINAL PARTY LOCATION STATS ===');
  console.log(JSON.stringify(stats[0], null, 2));

  await sql.end();
})();
