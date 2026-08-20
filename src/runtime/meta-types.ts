/**
 * Shape of the runtime model description emitted into `src/generated/metadata.ts`.
 * Keys are short because the metadata ships to the browser.
 */

export type DefKind = 'object' | 'choice' | 'enum' | 'enumWrapper' | 'extension' | 'scalar';

export type JsonType = 'string' | 'number' | 'integer' | 'boolean' | 'unknown';

export interface PropMeta {
  /** Property name in the DATEX II JSON encoding. */
  w: string;
  /** Property name in the friendly model (technical `G` suffix removed). */
  f: string;
  /** Referenced definition name, when the property points at another type. */
  t?: string;
  /** Inline JSON type, when the property is not a reference. */
  j?: JsonType;
  /** The property is a repeated element. */
  a?: boolean;
  /** The property is mandatory. */
  r?: boolean;
  minItems?: number;
  maxItems?: number;
  /** Inline enumeration values. */
  values?: string[];
  format?: string;
}

export interface ChoiceMeta {
  /** Property name carrying this member in the JSON encoding. */
  w: string;
  /** Definition name of the member, also the `_type` discriminator value. */
  t: string;
}

export interface Constraints {
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
}

export interface DefMeta {
  /** DATEX II namespace the definition comes from, e.g. `Situation`. */
  ns: string;
  /** Definition name inside the namespace. */
  name: string;
  kind: DefKind;
  props?: PropMeta[];
  choices?: ChoiceMeta[];
  /** Allowed literals for `kind: 'enum'`. */
  values?: string[];
  /** Underlying JSON type for `kind: 'scalar'`. */
  json?: JsonType;
  /** Definition this scalar aliases. */
  base?: string;
  constraints?: Constraints;
  /** Additional properties are permitted. */
  open?: boolean;
}
