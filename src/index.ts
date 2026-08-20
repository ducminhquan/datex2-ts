/**
 * datex2-ts - a dev-friendly TypeScript data model for DATEX II v3.
 *
 * Two representations of the same model:
 *
 * - **wire** (`datex2-ts/wire`) mirrors the DATEX II JSON encoding byte for byte.
 * - **friendly** (`datex2-ts/friendly`, re-exported here) drops the technical
 *   `G` suffixes, unwraps enums and turns substitution groups into
 *   `_type`-discriminated unions.
 *
 * `encode()` / `decode()` move between them losslessly.
 */

export * from './runtime/index.js';

export * from './generated/enums.js';
export type { FriendlyTypes } from './generated/friendly-registry.js';
export type { WireTypes } from './generated/wire-registry.js';

export * as wire from './generated/wire.js';
export * as friendly from './generated/friendly.js';
