import type { FriendlyTypes } from '../generated/friendly-registry.js';
import type { WireTypes } from '../generated/wire-registry.js';
import type { ConvertOptions } from './convert.js';
import { toFriendly, toWire } from './convert.js';
import { assertValid, validate, validateFriendly } from './validate.js';
import type { Issue, ValidateOptions } from './validate.js';

/** Every DATEX II type name that has both a wire and a friendly representation. */
export type ModelType = keyof FriendlyTypes & keyof WireTypes;

/**
 * Typed literal helper: pick a DATEX II type by name and get full completion and
 * checking for its friendly shape, without importing the interface.
 *
 * ```ts
 * const accident = create('Accident', { id: '1', accidentType: ['multipleVehicleCollision'], ... });
 * ```
 */
export function create<K extends ModelType>(type: K, init: FriendlyTypes[K]): FriendlyTypes[K] {
  void type;
  return init;
}

/** Same as {@link create} for the raw DATEX II JSON encoding. */
export function createWire<K extends ModelType>(type: K, init: WireTypes[K]): WireTypes[K] {
  void type;
  return init;
}

/** Convert a friendly value into the DATEX II JSON encoding, keeping types. */
export function encode<K extends ModelType>(
  type: K,
  value: FriendlyTypes[K],
  options?: ConvertOptions,
): WireTypes[K] {
  return toWire(value, type, options) as WireTypes[K];
}

/** Convert a DATEX II JSON value into the friendly model, keeping types. */
export function decode<K extends ModelType>(
  type: K,
  value: WireTypes[K] | unknown,
  options?: ConvertOptions,
): FriendlyTypes[K] {
  return toFriendly(value, type, options) as FriendlyTypes[K];
}

/** {@link encode} plus validation; throws `ValidationError` when invalid. */
export function encodeStrict<K extends ModelType>(
  type: K,
  value: FriendlyTypes[K],
  options?: ConvertOptions & ValidateOptions,
): WireTypes[K] {
  return assertValid(encode(type, value, options), type, options);
}

/** Validate a friendly value against the model. */
export function check<K extends ModelType>(
  type: K,
  value: FriendlyTypes[K],
  options?: ValidateOptions,
): Issue[] {
  return validateFriendly(value, type, options);
}

/** Validate a wire value against the model. */
export function checkWire<K extends ModelType>(
  type: K,
  value: WireTypes[K] | unknown,
  options?: ValidateOptions,
): Issue[] {
  return validate(value, type, options);
}
