import type { DefMeta, PropMeta } from './meta-types.js';
import { choicesByType, choicesByWire, getDef } from './model.js';

/** Discriminator property used by the friendly representation of a choice. */
export const TYPE_KEY = '_type';

export interface ConvertOptions {
  /**
   * Drop properties the model does not declare instead of copying them through.
   * Default `false`, so profile or extension data survives a round trip.
   */
  strict?: boolean;
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && !(v instanceof Date);

const isNullish = (v: unknown): v is null | undefined => v === null || v === undefined;

/* -------------------------------------------------------------------------- */
/* friendly -> wire                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Convert a value written in the friendly model into the DATEX II JSON encoding.
 *
 * Accepts friendly *or* wire property names, bare strings where an enum wrapper
 * is expected, a single item where a list is expected, and `Date` objects where
 * a date-time string is expected.
 */
export function toWire(value: unknown, typeName: string, options: ConvertOptions = {}): unknown {
  return convert(value, typeName, options, 'wire');
}

/**
 * Convert a DATEX II JSON document into the friendly model: technical `G`
 * suffixes removed, enum wrappers unwrapped and substitution groups flattened
 * into `_type`-discriminated objects.
 */
export function toFriendly(value: unknown, typeName: string, options: ConvertOptions = {}): unknown {
  return convert(value, typeName, options, 'friendly');
}

type Direction = 'wire' | 'friendly';

function convert(
  value: unknown,
  typeName: string,
  options: ConvertOptions,
  dir: Direction,
): unknown {
  if (isNullish(value)) return value;
  const def = getDef(typeName);
  switch (def.kind) {
    case 'scalar':
      return convertScalar(value, def, dir);
    case 'enum':
      return value;
    case 'extension':
      return structuredCopy(value);
    case 'enumWrapper':
      return dir === 'wire' ? enumToWire(value) : enumToFriendly(value);
    case 'object':
      return convertObject(value, def, options, dir);
    case 'choice':
      return convertChoice(value, def, options, dir);
    default:
      return value;
  }
}

function convertScalar(value: unknown, def: DefMeta, dir: Direction): unknown {
  if (dir === 'wire' && value instanceof Date && def.json === 'string') {
    return value.toISOString();
  }
  return value;
}

function enumToWire(value: unknown): unknown {
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = { value: value['value'] };
    const extended = value['extendedValue'] ?? value['extendedValueG'];
    if (!isNullish(extended)) out['extendedValueG'] = extended;
    return out;
  }
  return { value };
}

function enumToFriendly(value: unknown): unknown {
  if (!isPlainObject(value)) return value;
  const extended = value['extendedValueG'] ?? value['extendedValue'];
  if (isNullish(extended)) return value['value'];
  return { value: value['value'], extendedValue: extended };
}

function convertObject(
  value: unknown,
  def: DefMeta,
  options: ConvertOptions,
  dir: Direction,
): unknown {
  if (!isPlainObject(value)) return value;
  const out: Record<string, unknown> = {};
  const consumed = new Set<string>();

  for (const p of def.props ?? []) {
    const from = dir === 'wire' ? p.f : p.w;
    const alt = dir === 'wire' ? p.w : p.f;
    const to = dir === 'wire' ? p.w : p.f;
    let raw = value[from];
    if (isNullish(raw) && from !== alt) raw = value[alt];
    consumed.add(from);
    consumed.add(alt);
    if (isNullish(raw)) continue;
    out[to] = convertProp(raw, p, options, dir);
  }

  copyExtras(value, out, consumed, options);
  return out;
}

function convertProp(
  raw: unknown,
  p: PropMeta,
  options: ConvertOptions,
  dir: Direction,
): unknown {
  if (p.a) {
    const items = Array.isArray(raw) ? raw : [raw];
    return items.map((item) => convertLeaf(item, p, options, dir));
  }
  return convertLeaf(raw, p, options, dir);
}

function convertLeaf(raw: unknown, p: PropMeta, options: ConvertOptions, dir: Direction): unknown {
  if (p.t) return convert(raw, p.t, options, dir);
  if (dir === 'wire' && raw instanceof Date) return raw.toISOString();
  return raw;
}

function convertChoice(
  value: unknown,
  def: DefMeta,
  options: ConvertOptions,
  dir: Direction,
): unknown {
  if (!isPlainObject(value)) return value;

  const out: Record<string, unknown> = {};
  const consumed = new Set<string>([TYPE_KEY]);

  for (const p of def.props ?? []) {
    const from = dir === 'wire' ? p.f : p.w;
    const alt = dir === 'wire' ? p.w : p.f;
    const to = dir === 'wire' ? p.w : p.f;
    consumed.add(from);
    consumed.add(alt);
    let raw = value[from];
    if (isNullish(raw) && from !== alt) raw = value[alt];
    if (isNullish(raw)) continue;
    out[to] = convertProp(raw, p, options, dir);
  }

  if (dir === 'wire') {
    const byType = choicesByType(def);
    const byWire = choicesByWire(def);
    const declared = value[TYPE_KEY];
    let member = typeof declared === 'string' ? byType.get(declared) : undefined;
    let payload: unknown;

    if (member) {
      // Flattened friendly form: everything left over belongs to the member.
      const rest: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        if (consumed.has(k) || byWire.has(k)) continue;
        rest[k] = v;
      }
      payload = rest;
    } else {
      // Already in wire form: `{ sitAccident: { ... } }`.
      for (const [k, v] of Object.entries(value)) {
        const hit = byWire.get(k);
        if (hit && !isNullish(v)) {
          member = hit;
          payload = v;
          break;
        }
      }
    }

    if (member) {
      out[member.w] = convert(payload, member.t, options, dir);
      return out;
    }
    copyExtras(value, out, consumed, options);
    return out;
  }

  // wire -> friendly: flatten the single member that is set.
  for (const c of def.choices ?? []) {
    consumed.add(c.w);
    const raw = value[c.w];
    if (isNullish(raw)) continue;
    const member = convert(raw, c.t, options, 'friendly');
    Object.assign(out, { [TYPE_KEY]: c.t }, isPlainObject(member) ? member : { value: member });
    copyExtras(value, out, consumed, options);
    return out;
  }

  copyExtras(value, out, consumed, options);
  return out;
}

function copyExtras(
  source: Record<string, unknown>,
  target: Record<string, unknown>,
  consumed: Set<string>,
  options: ConvertOptions,
): void {
  if (options.strict) return;
  for (const [k, v] of Object.entries(source)) {
    if (consumed.has(k) || k in target || isNullish(v)) continue;
    target[k] = v;
  }
}

function structuredCopy<T>(value: T): T {
  if (Array.isArray(value)) return value.map(structuredCopy) as unknown as T;
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = structuredCopy(v);
    return out as T;
  }
  return value;
}

export { isPlainObject };
