import { defs, roots, namespaces, payloadDefaults } from '../generated/metadata.js';
import type { TypeName } from '../generated/metadata.js';
import type { ChoiceMeta, DefMeta, PropMeta } from './meta-types.js';

export { defs, roots, namespaces, payloadDefaults };
export type { TypeName };
export type * from './meta-types.js';

/** Raised when an operation names a type the generated model does not contain. */
export class UnknownTypeError extends Error {
  constructor(public readonly typeName: string) {
    super(`Unknown DATEX II type: "${typeName}"`);
    this.name = 'UnknownTypeError';
  }
}

/** Look up the runtime description of a DATEX II type. Throws if unknown. */
export function getDef(typeName: string): DefMeta {
  const def = (defs as Record<string, DefMeta | undefined>)[typeName];
  if (!def) throw new UnknownTypeError(typeName);
  return def;
}

/** Look up a type without throwing. */
export function findDef(typeName: string): DefMeta | undefined {
  return (defs as Record<string, DefMeta | undefined>)[typeName];
}

/** Every type name in the generated model. */
export function typeNames(): TypeName[] {
  return Object.keys(defs) as TypeName[];
}

/** Type names belonging to one DATEX II namespace. */
export function typeNamesIn(ns: string): TypeName[] {
  return typeNames().filter((n) => getDef(n).ns === ns);
}

/** Index a definition's properties by their JSON (wire) name. */
export function propsByWire(def: DefMeta): Map<string, PropMeta> {
  const map = new Map<string, PropMeta>();
  for (const p of def.props ?? []) map.set(p.w, p);
  return map;
}

/** The friendly name of a property, falling back to its wire name. */
export function friendlyName(p: PropMeta): string {
  return p.f ?? p.w;
}

/** Index a definition's properties by their friendly name. */
export function propsByFriendly(def: DefMeta): Map<string, PropMeta> {
  const map = new Map<string, PropMeta>();
  for (const p of def.props ?? []) map.set(friendlyName(p), p);
  return map;
}

/** Index a choice's members by their `_type` discriminator value. */
export function choicesByType(def: DefMeta): Map<string, ChoiceMeta> {
  const map = new Map<string, ChoiceMeta>();
  for (const c of def.choices ?? []) map.set(c.t, c);
  return map;
}

/** Index a choice's members by the JSON property that carries them. */
export function choicesByWire(def: DefMeta): Map<string, ChoiceMeta> {
  const map = new Map<string, ChoiceMeta>();
  for (const c of def.choices ?? []) map.set(c.w, c);
  return map;
}

/** Follow a scalar alias chain down to its JSON primitive plus constraints. */
export function resolveScalar(typeName: string): { json: string; constraints: DefMeta['constraints'] } {
  const def = getDef(typeName);
  return { json: def.json ?? 'unknown', constraints: def.constraints };
}

/** The names a choice type accepts as its `_type` discriminator. */
export function membersOf(typeName: string): TypeName[] {
  return (getDef(typeName).choices ?? []).map((c) => c.t as TypeName);
}
