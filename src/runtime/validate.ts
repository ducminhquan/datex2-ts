import type { DefMeta, PropMeta } from './meta-types.js';
import { findDef, choicesByWire } from './model.js';
import { isPlainObject, toWire } from './convert.js';

export type IssueCode =
  | 'missingRequired'
  | 'unknownProperty'
  | 'wrongType'
  | 'notAnArray'
  | 'tooFewItems'
  | 'tooManyItems'
  | 'notInEnum'
  | 'emptyChoice'
  | 'ambiguousChoice'
  | 'outOfRange'
  | 'tooLong'
  | 'patternMismatch'
  | 'unknownType';

export interface Issue {
  /** JSON pointer-ish path, e.g. `situation.0.situationRecord.0`. */
  path: string;
  code: IssueCode;
  message: string;
  /** DATEX II type the check ran against. */
  type?: string;
}

export interface ValidateOptions {
  /** Report properties the model does not declare. Default `true`. */
  reportUnknown?: boolean;
  /** Stop after this many issues. Default `Infinity`. */
  maxIssues?: number;
}

/** Thrown by {@link assertValid}. */
export class ValidationError extends Error {
  constructor(
    public readonly issues: Issue[],
    typeName: string,
  ) {
    super(
      `${issues.length} DATEX II validation issue(s) for ${typeName}:\n` +
        issues.map((i) => `  - ${i.path || '<root>'}: ${i.message}`).join('\n'),
    );
    this.name = 'ValidationError';
  }
}

/** Validate a document in the DATEX II JSON (wire) encoding. */
export function validate(
  value: unknown,
  typeName: string,
  options: ValidateOptions = {},
): Issue[] {
  const ctx: Ctx = {
    issues: [],
    reportUnknown: options.reportUnknown ?? true,
    maxIssues: options.maxIssues ?? Number.POSITIVE_INFINITY,
  };
  check(value, typeName, '', ctx);
  return ctx.issues;
}

/** Validate a value written in the friendly model by converting it first. */
export function validateFriendly(
  value: unknown,
  typeName: string,
  options: ValidateOptions = {},
): Issue[] {
  return validate(toWire(value, typeName), typeName, options);
}

/** Validate and throw {@link ValidationError} when anything is wrong. */
export function assertValid<T>(value: T, typeName: string, options?: ValidateOptions): T {
  const issues = validate(value, typeName, options);
  if (issues.length) throw new ValidationError(issues, typeName);
  return value;
}

/** Convenience predicate around {@link validate}. */
export function isValid(value: unknown, typeName: string, options?: ValidateOptions): boolean {
  return validate(value, typeName, { ...options, maxIssues: 1 }).length === 0;
}

interface Ctx {
  issues: Issue[];
  reportUnknown: boolean;
  maxIssues: number;
}

const join = (path: string, key: string | number) => (path ? `${path}.${key}` : String(key));

function add(ctx: Ctx, path: string, code: IssueCode, message: string, type?: string): void {
  if (ctx.issues.length >= ctx.maxIssues) return;
  ctx.issues.push({ path, code, message, type });
}

const full = (ctx: Ctx) => ctx.issues.length >= ctx.maxIssues;

function check(value: unknown, typeName: string, path: string, ctx: Ctx): void {
  if (full(ctx)) return;
  const def = findDef(typeName);
  if (!def) {
    add(ctx, path, 'unknownType', `unknown DATEX II type "${typeName}"`);
    return;
  }
  switch (def.kind) {
    case 'scalar':
      checkScalar(value, def, path, ctx, typeName);
      return;
    case 'enum':
      if (typeof value !== 'string' || !(def.values ?? []).includes(value)) {
        add(ctx, path, 'notInEnum', `expected one of ${(def.values ?? []).join(', ')}`, typeName);
      }
      return;
    case 'extension':
      if (!isPlainObject(value)) {
        add(ctx, path, 'wrongType', 'expected an object', typeName);
      }
      return;
    case 'enumWrapper':
    case 'object':
      checkObject(value, def, path, ctx, typeName);
      return;
    case 'choice':
      checkChoice(value, def, path, ctx, typeName);
      return;
  }
}

function checkScalar(
  value: unknown,
  def: DefMeta,
  path: string,
  ctx: Ctx,
  typeName: string,
): void {
  const json = def.json ?? 'unknown';
  if (json === 'string' && typeof value !== 'string') {
    add(ctx, path, 'wrongType', `expected a string`, typeName);
    return;
  }
  if ((json === 'number' || json === 'integer') && typeof value !== 'number') {
    add(ctx, path, 'wrongType', `expected a number`, typeName);
    return;
  }
  if (json === 'integer' && !Number.isInteger(value)) {
    add(ctx, path, 'wrongType', `expected an integer`, typeName);
    return;
  }
  if (json === 'boolean' && typeof value !== 'boolean') {
    add(ctx, path, 'wrongType', `expected a boolean`, typeName);
    return;
  }
  const c = def.constraints;
  if (!c) return;
  if (typeof value === 'number') {
    if (c.minimum !== undefined && value < c.minimum) {
      add(ctx, path, 'outOfRange', `must be >= ${c.minimum}`, typeName);
    }
    if (c.maximum !== undefined && value > c.maximum) {
      add(ctx, path, 'outOfRange', `must be <= ${c.maximum}`, typeName);
    }
    if (c.exclusiveMinimum !== undefined && value <= c.exclusiveMinimum) {
      add(ctx, path, 'outOfRange', `must be > ${c.exclusiveMinimum}`, typeName);
    }
    if (c.exclusiveMaximum !== undefined && value >= c.exclusiveMaximum) {
      add(ctx, path, 'outOfRange', `must be < ${c.exclusiveMaximum}`, typeName);
    }
  }
  if (typeof value === 'string') {
    if (c.maxLength !== undefined && value.length > c.maxLength) {
      add(ctx, path, 'tooLong', `must be at most ${c.maxLength} characters`, typeName);
    }
    if (c.minLength !== undefined && value.length < c.minLength) {
      add(ctx, path, 'tooLong', `must be at least ${c.minLength} characters`, typeName);
    }
    if (c.pattern && !new RegExp(c.pattern).test(value)) {
      add(ctx, path, 'patternMismatch', `must match ${c.pattern}`, typeName);
    }
  }
}

function checkProps(
  value: Record<string, unknown>,
  def: DefMeta,
  path: string,
  ctx: Ctx,
  known: Set<string>,
): void {
  for (const p of def.props ?? []) {
    known.add(p.w);
    const raw = value[p.w];
    if (raw === undefined || raw === null) {
      if (p.r) {
        add(ctx, join(path, p.w), 'missingRequired', `"${p.w}" is required`, def.name);
      }
      continue;
    }
    checkProp(raw, p, join(path, p.w), ctx);
    if (full(ctx)) return;
  }
}

function checkProp(raw: unknown, p: PropMeta, path: string, ctx: Ctx): void {
  if (p.a) {
    if (!Array.isArray(raw)) {
      add(ctx, path, 'notAnArray', `"${p.w}" must be an array`);
      return;
    }
    if (p.minItems !== undefined && raw.length < p.minItems) {
      add(ctx, path, 'tooFewItems', `"${p.w}" needs at least ${p.minItems} item(s)`);
    }
    if (p.maxItems !== undefined && raw.length > p.maxItems) {
      add(ctx, path, 'tooManyItems', `"${p.w}" allows at most ${p.maxItems} item(s)`);
    }
    raw.forEach((item, i) => checkLeaf(item, p, join(path, i), ctx));
    return;
  }
  checkLeaf(raw, p, path, ctx);
}

function checkLeaf(raw: unknown, p: PropMeta, path: string, ctx: Ctx): void {
  if (p.t) {
    check(raw, p.t, path, ctx);
    return;
  }
  if (p.values && (typeof raw !== 'string' || !p.values.includes(raw))) {
    add(ctx, path, 'notInEnum', `expected one of ${p.values.join(', ')}`);
    return;
  }
  const j = p.j;
  if (j === 'string' && typeof raw === 'string' && p.pattern && !new RegExp(p.pattern).test(raw)) {
    add(ctx, path, 'patternMismatch', `must match ${p.pattern}`);
    return;
  }
  if (j === 'string' && typeof raw !== 'string') add(ctx, path, 'wrongType', 'expected a string');
  else if ((j === 'number' || j === 'integer') && typeof raw !== 'number') {
    add(ctx, path, 'wrongType', 'expected a number');
  } else if (j === 'boolean' && typeof raw !== 'boolean') {
    add(ctx, path, 'wrongType', 'expected a boolean');
  }
}

function checkObject(
  value: unknown,
  def: DefMeta,
  path: string,
  ctx: Ctx,
  typeName: string,
): void {
  if (!isPlainObject(value)) {
    add(ctx, path, 'wrongType', 'expected an object', typeName);
    return;
  }
  const known = new Set<string>();
  checkProps(value, def, path, ctx, known);
  reportUnknown(value, def, path, ctx, known);
}

function checkChoice(
  value: unknown,
  def: DefMeta,
  path: string,
  ctx: Ctx,
  typeName: string,
): void {
  if (!isPlainObject(value)) {
    add(ctx, path, 'wrongType', 'expected an object', typeName);
    return;
  }
  const known = new Set<string>();
  checkProps(value, def, path, ctx, known);

  const byWire = choicesByWire(def);
  const present: string[] = [];
  for (const [wire] of byWire) {
    known.add(wire);
    if (value[wire] !== undefined && value[wire] !== null) present.push(wire);
  }
  if (present.length === 0) {
    add(
      ctx,
      path,
      'emptyChoice',
      `expected exactly one of: ${[...byWire.keys()].join(', ')}`,
      typeName,
    );
  } else if (present.length > 1) {
    add(ctx, path, 'ambiguousChoice', `only one of ${present.join(', ')} may be set`, typeName);
  } else {
    const member = byWire.get(present[0]!)!;
    check(value[present[0]!], member.t, join(path, present[0]!), ctx);
  }
  reportUnknown(value, def, path, ctx, known);
}

function reportUnknown(
  value: Record<string, unknown>,
  def: DefMeta,
  path: string,
  ctx: Ctx,
  known: Set<string>,
): void {
  if (!ctx.reportUnknown || def.open) return;
  for (const k of Object.keys(value)) {
    if (known.has(k)) continue;
    add(ctx, join(path, k), 'unknownProperty', `"${k}" is not declared by ${def.ns}::${def.name}`, def.name);
  }
}
