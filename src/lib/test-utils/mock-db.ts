import { vi } from "vitest";

/**
 * Builds a chainable mock for a `db.select().from().where().limit()` query.
 * The row type is inferred from the passed rows.
 */
export function mockChainReturn<T>(rows: T) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  return { from, where, limit };
}

/**
 * Builds a chainable mock for a `db.insert().values().returning()` query.
 * The row type is inferred from the passed rows.
 */
export function mockInsertReturn<T>(rows: T) {
  const returning = vi.fn().mockResolvedValue(rows);
  const values = vi.fn().mockReturnValue({ returning });
  return { values, returning };
}

/**
 * Builds a chainable mock for a `db.update().set().where().returning()` query.
 * The row type is inferred from the passed rows.
 */
export function mockUpdateReturn<T>(rows: T) {
  const returning = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockReturnValue({ where });
  return { set, where, returning };
}

/**
 * Builds a chainable mock for a `db.delete().where().returning()` query.
 * The row type is inferred from the passed rows.
 */
export function mockDeleteReturn<T>(rows: T) {
  const returning = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ returning });
  return { where, returning };
}