/**
 * Small helpers shared by every union module.
 *
 * Every domain vocabulary in @bela/types follows the same shape so it stays
 * portable (Constraint: status/profile are `String` in the Prisma schema +
 * union here — never a native DB enum, so the SQLite↔Postgres swap is trivial):
 *
 *   export const FOO = ['a', 'b'] as const;
 *   export type Foo = (typeof FOO)[number];
 *   export const FOO_LABELS: LabelMap<Foo> = { a: '…', b: '…' };
 *
 * The `as const` tuple is the single source of truth; the string-literal union
 * and the PT-BR label map both derive from it, so a new value can never drift
 * out of sync between the schema, the two apps and the backend.
 */

/** A complete, exhaustive PT-BR label for every member of a union. */
export type LabelMap<T extends string> = Record<T, string>;

/** Narrowing type guard: is `value` a member of the given union tuple? */
export function isMember<T extends string>(
  values: readonly T[],
  value: string,
): value is T {
  return (values as readonly string[]).includes(value);
}
