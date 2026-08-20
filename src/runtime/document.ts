import { roots } from '../generated/metadata.js';
import type { TypeName } from '../generated/metadata.js';
import type { FriendlyTypes } from '../generated/friendly-registry.js';
import { isPlainObject } from './convert.js';
import { decode, encode } from './factory.js';
import type { ModelType } from './factory.js';
import { assertValid } from './validate.js';
import type { ValidateOptions } from './validate.js';

/** Root wrapper properties declared by the DATEX II schema documents. */
export const rootTypes: Record<string, TypeName> = roots as Record<string, TypeName>;

/** Order in which ambiguous documents are matched against the known roots. */
const ROOT_PRIORITY = ['messageContainer', 'payload'];

export interface DetectedRoot {
  /** Wrapper property, e.g. `payload` or `messageContainer`. */
  root: string;
  /** DATEX II type of the wrapped value. */
  type: TypeName;
  /** The wrapped value, still in the JSON (wire) encoding. */
  value: unknown;
}

/** Recognise the DATEX II envelope a raw document is wrapped in. */
export function detectRoot(doc: unknown): DetectedRoot | undefined {
  if (!isPlainObject(doc)) return undefined;
  const candidates = Object.keys(rootTypes).sort(
    (a, b) =>
      (ROOT_PRIORITY.indexOf(a) + 1 || ROOT_PRIORITY.length + 1) -
      (ROOT_PRIORITY.indexOf(b) + 1 || ROOT_PRIORITY.length + 1),
  );
  for (const root of candidates) {
    const value = doc[root];
    if (value !== undefined && value !== null) {
      return { root, type: rootTypes[root]!, value };
    }
  }
  return undefined;
}

export interface ParseOptions extends ValidateOptions {
  /** Throw when the document does not satisfy the model. Default `false`. */
  validate?: boolean;
}

export interface ParseResult<K extends ModelType = ModelType> {
  /** Wrapper property the document used, when it had one. */
  root?: string;
  /** DATEX II type the payload was decoded as. */
  type: K;
  /** The payload in the friendly model. */
  value: FriendlyTypes[K];
  /** The payload exactly as it appeared in the JSON encoding. */
  wire: unknown;
}

/**
 * Read a DATEX II JSON document (string or already-parsed object), unwrap its
 * envelope and decode the payload into the friendly model.
 *
 * Pass `type` explicitly for fragments that carry no envelope.
 */
export function parse<K extends ModelType>(
  input: string | object,
  type: K,
  options?: ParseOptions,
): ParseResult<K>;
export function parse(input: string | object, type?: undefined, options?: ParseOptions): ParseResult;
export function parse(
  input: string | object,
  type?: ModelType,
  options: ParseOptions = {},
): ParseResult {
  const doc: unknown = typeof input === 'string' ? JSON.parse(input) : input;

  let root: string | undefined;
  let resolved: ModelType | undefined = type;
  let wire: unknown = doc;

  const detected = detectRoot(doc);
  if (detected && (!type || detected.type === type)) {
    root = detected.root;
    resolved = detected.type as ModelType;
    wire = detected.value;
  }

  if (!resolved) {
    throw new Error(
      `Cannot determine the DATEX II type of this document. Known envelopes: ${Object.keys(
        rootTypes,
      ).join(', ')}. Pass the type explicitly.`,
    );
  }
  if (options.validate) assertValid(wire, resolved, options);

  return { root, type: resolved, wire, value: decode(resolved, wire) };
}

export interface SerializeOptions extends ValidateOptions {
  /** Wrapper property to emit. Defaults to the one declared for the type. */
  root?: string | false;
  /** Throw when the encoded document does not satisfy the model. Default `false`. */
  validate?: boolean;
  /** `JSON.stringify` indentation. */
  space?: number;
}

/** Encode a friendly value and wrap it in its DATEX II envelope. */
export function toDocument<K extends ModelType>(
  value: FriendlyTypes[K],
  type: K,
  options: SerializeOptions = {},
): unknown {
  const wire: unknown = encode(type, value);
  if (options.validate) assertValid(wire, type, options);
  const root =
    options.root === false
      ? undefined
      : (options.root ?? Object.keys(rootTypes).find((k) => rootTypes[k] === type));
  return root ? { [root]: wire } : wire;
}

/** {@link toDocument} followed by `JSON.stringify`. */
export function serialize<K extends ModelType>(
  value: FriendlyTypes[K],
  type: K,
  options: SerializeOptions = {},
): string {
  return JSON.stringify(toDocument(value, type, options), null, options.space);
}
