-- Backfill party.location_id from their most frequent expense location
-- For parties with no location set, derives it from the mode location of their expenses
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
  AND p.location_id IS NULL;
