/**
 * Structural-sharing-free immutable editing: clone, mutate, return.
 *
 * `edit()` is the type-safe counterpart to the string paths in `path.ts` - the
 * draft is a plain deep copy, so ordinary TypeScript narrowing and completion
 * work while you mutate it.
 */

/** Deep-copy plain JSON data (objects, arrays, primitives and `Date`). */
export function clone<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return new Date(value.getTime()) as unknown as T;
  if (Array.isArray(value)) return value.map(clone) as unknown as T;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = clone(v);
  return out as T;
}

/**
 * Apply `recipe` to a deep copy of `value` and return the copy. The input is
 * never mutated.
 *
 * ```ts
 * const next = edit(situation, (draft) => {
 *   draft.headerInformation.informationStatus = 'real';
 * });
 * ```
 */
export function edit<T>(value: T, recipe: (draft: T) => void | T): T {
  const draft = clone(value);
  const result = recipe(draft);
  return (result === undefined ? draft : result) as T;
}

/** Recursively freeze a document so accidental mutation throws in strict mode. */
export function freeze<T>(value: T): Readonly<T> {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const v of Object.values(value as Record<string, unknown>)) freeze(v);
  return Object.freeze(value);
}

/**
 * Remove `undefined`, `null`, empty arrays and empty objects, so a document
 * built up incrementally serialises without noise.
 */
export function prune<T>(value: T): T {
  if (Array.isArray(value)) {
    const list = value.map(prune).filter((v) => v !== undefined);
    return list as unknown as T;
  }
  if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const pruned = prune(v);
      if (pruned === undefined || pruned === null) continue;
      if (Array.isArray(pruned) && pruned.length === 0) continue;
      if (
        pruned !== null &&
        typeof pruned === 'object' &&
        !Array.isArray(pruned) &&
        !(pruned instanceof Date) &&
        Object.keys(pruned).length === 0
      ) {
        continue;
      }
      out[k] = pruned;
    }
    return out as T;
  }
  return value === null ? (undefined as unknown as T) : value;
}
