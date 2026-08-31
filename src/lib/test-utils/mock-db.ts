import { vi } from "vitest";

/**
 * Builds a chainable mock for a `db.select().from().where().limit()` query.
 * Also supports `.orderBy()` which resolves directly to rows.
 * The `where()` return is thenable so `await db.select().from().where()` works in Promise.all.
 * The row type is inferred from the passed rows.
 */
export function mockChainReturn<T>(rows: T) {
  const limit = vi.fn().mockResolvedValue(rows);
  const orderBy = vi.fn().mockResolvedValue(rows);
  const whereThenable = { orderBy, limit, then: (resolve: (value: unknown) => void) => { resolve(rows); } };
  const where = vi.fn().mockReturnValue(whereThenable);
  const from = vi.fn().mockReturnValue({ where, orderBy, limit });
  return { from, where, orderBy, limit };
}

/**
 * Builds a chainable mock for a `db.select().from().where().orderBy().limit().offset()` query.
 */
export function mockChainReturnOrdered<T>(rows: T) {
  const offset = vi.fn().mockResolvedValue(rows);
  const limit = vi.fn().mockReturnValue({ offset });
  const orderBy = vi.fn().mockReturnValue({ limit });
  const where = vi.fn().mockReturnValue({ orderBy });
  const from = vi.fn().mockReturnValue({ where });
  return { from, where, orderBy, limit, offset };
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