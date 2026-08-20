import type { TypeName } from '../generated/metadata.js';
import type { WireTypes } from '../generated/wire-registry.js';
import { isPlainObject } from './convert.js';
import { findDef } from './model.js';

export interface WalkNode {
  /** The value at this position, in the DATEX II JSON (wire) encoding. */
  value: unknown;
  /** DATEX II type name the model expects here. */
  type: string;
  /** Dot-separated path from the walk root. */
  path: string;
}

export type Visitor = (node: WalkNode) => void | false;

const join = (path: string, key: string | number) => (path ? `${path}.${key}` : String(key));

/**
 * Depth-first traversal of a wire document, guided by the generated model.
 * Return `false` from the visitor to skip a subtree.
 */
export function walk(value: unknown, typeName: string, visit: Visitor): void {
  const seen = new Set<object>();

  const step = (node: unknown, type: string, path: string): void => {
    if (node === null || node === undefined) return;
    if (typeof node === 'object') {
      if (seen.has(node)) return;
      seen.add(node);
    }
    if (visit({ value: node, type, path }) === false) return;

    const def = findDef(type);
    if (!def || !isPlainObject(node)) return;

    for (const p of def.props ?? []) {
      const raw = node[p.w];
      if (raw === null || raw === undefined || !p.t) continue;
      if (p.a && Array.isArray(raw)) {
        raw.forEach((item, i) => step(item, p.t!, join(join(path, p.w), i)));
      } else {
        step(raw, p.t, join(path, p.w));
      }
    }
    for (const c of def.choices ?? []) {
      const raw = node[c.w];
      if (raw === null || raw === undefined) continue;
      step(raw, c.t, join(path, c.w));
    }
  };

  step(value, typeName, '');
}

/**
 * Collect every occurrence of a DATEX II type inside a wire document.
 *
 * ```ts
 * const accidents = collect(message, 'MessageContainer', 'Accident');
 * ```
 */
export function collect<K extends TypeName & keyof WireTypes>(
  value: unknown,
  rootType: string,
  target: K,
): WireTypes[K][] {
  const found: WireTypes[K][] = [];
  walk(value, rootType, (node) => {
    if (node.type === target) found.push(node.value as WireTypes[K]);
  });
  return found;
}

/** Like {@link collect} but also reports where each match was found. */
export function collectWithPaths<K extends TypeName & keyof WireTypes>(
  value: unknown,
  rootType: string,
  target: K,
): { path: string; value: WireTypes[K] }[] {
  const found: { path: string; value: WireTypes[K] }[] = [];
  walk(value, rootType, (node) => {
    if (node.type === target) found.push({ path: node.path, value: node.value as WireTypes[K] });
  });
  return found;
}
