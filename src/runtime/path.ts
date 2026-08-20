/**
 * Immutable, auto-vivifying access into deeply nested DATEX II documents.
 *
 * Paths are dot-separated (`"situation.0.situationRecord.0"`) or arrays of
 * segments. Numeric segments address array elements. `*` matches every element
 * of an array or every value of an object and is only understood by
 * {@link select}.
 */

export type PathSegment = string | number;
export type PathInput = string | readonly PathSegment[];

const isIndex = (s: string): boolean => /^(0|[1-9][0-9]*)$/.test(s);

/** Split a path into segments, turning numeric ones into numbers. */
export function parsePath(path: PathInput): PathSegment[] {
  if (Array.isArray(path)) return [...path] as PathSegment[];
  const raw = String(path);
  if (raw === '') return [];
  return raw.split('.').map((s) => (isIndex(s) ? Number(s) : s));
}

/** Render segments back into a dot-separated path. */
export function formatPath(path: PathInput): string {
  return parsePath(path).join('.');
}

const container = (segment: PathSegment): unknown[] | Record<string, unknown> =>
  typeof segment === 'number' ? [] : {};

function read(node: unknown, segment: PathSegment): unknown {
  if (node === null || node === undefined) return undefined;
  if (Array.isArray(node)) return typeof segment === 'number' ? node[segment] : undefined;
  if (typeof node === 'object') return (node as Record<string, unknown>)[String(segment)];
  return undefined;
}

/** Read the value at `path`, or `undefined` when any step is missing. */
export function getIn(value: unknown, path: PathInput): unknown {
  let node = value;
  for (const segment of parsePath(path)) {
    node = read(node, segment);
    if (node === undefined) return undefined;
  }
  return node;
}

/** True when the path resolves to something other than `undefined`. */
export function hasIn(value: unknown, path: PathInput): boolean {
  return getIn(value, path) !== undefined;
}

function shallowCopy(node: unknown, segment: PathSegment): unknown[] | Record<string, unknown> {
  if (Array.isArray(node)) return [...node];
  if (node !== null && typeof node === 'object') return { ...(node as Record<string, unknown>) };
  return container(segment);
}

/**
 * Return a copy of `value` with `path` set. Missing intermediate objects and
 * arrays are created; nothing outside the path is copied deeply.
 */
export function setIn<T>(value: T, path: PathInput, next: unknown): T {
  const segments = parsePath(path);
  if (segments.length === 0) return next as T;

  const write = (node: unknown, depth: number): unknown => {
    const segment = segments[depth]!;
    const copy = shallowCopy(node, segment);
    const child =
      depth === segments.length - 1 ? next : write(read(node, segment), depth + 1);
    if (Array.isArray(copy)) copy[segment as number] = child;
    else copy[String(segment)] = child;
    return copy;
  };

  return write(value, 0) as T;
}

/** Return a copy of `value` with `path` replaced by `updater(current)`. */
export function updateIn<T>(
  value: T,
  path: PathInput,
  updater: (current: unknown) => unknown,
): T {
  return setIn(value, path, updater(getIn(value, path)));
}

/** Return a copy of `value` without the property or element at `path`. */
export function deleteIn<T>(value: T, path: PathInput): T {
  const segments = parsePath(path);
  if (segments.length === 0) return undefined as unknown as T;
  const parentPath = segments.slice(0, -1);
  const last = segments[segments.length - 1]!;
  const parent = getIn(value, parentPath);
  if (parent === null || parent === undefined) return value;

  if (Array.isArray(parent)) {
    if (typeof last !== 'number') return value;
    const copy = parent.filter((_, i) => i !== last);
    return parentPath.length ? setIn(value, parentPath, copy) : (copy as unknown as T);
  }
  if (typeof parent !== 'object') return value;
  const copy = { ...(parent as Record<string, unknown>) };
  delete copy[String(last)];
  return parentPath.length ? setIn(value, parentPath, copy) : (copy as unknown as T);
}

/** Return a copy of `value` with `items` appended to the array at `path`. */
export function pushIn<T>(value: T, path: PathInput, ...items: unknown[]): T {
  const current = getIn(value, path);
  const list = Array.isArray(current) ? current : current === undefined ? [] : [current];
  return setIn(value, path, [...list, ...items]);
}

/**
 * Collect every value matching a path that may contain `*` wildcards.
 *
 * ```ts
 * select(doc, 'situation.*.situationRecord.*.sitAccident');
 * ```
 */
export function select(value: unknown, path: PathInput): unknown[] {
  const segments = parsePath(path);
  let nodes: unknown[] = [value];
  for (const segment of segments) {
    const next: unknown[] = [];
    for (const node of nodes) {
      if (node === null || node === undefined) continue;
      if (segment === '*') {
        if (Array.isArray(node)) next.push(...node);
        else if (typeof node === 'object') next.push(...Object.values(node as object));
        continue;
      }
      const child = read(node, segment);
      if (child !== undefined) next.push(child);
    }
    nodes = next;
  }
  return nodes;
}
