/**
 * DATEX II types in the friendly model: technical `G` suffixes removed, enums
 * as plain string unions and substitution groups as `_type`-discriminated
 * unions. Convert to and from the wire encoding with `encode()` / `decode()`.
 */
export * from './generated/friendly.js';
export type { FriendlyTypes } from './generated/friendly-registry.js';
