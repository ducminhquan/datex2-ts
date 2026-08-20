# Changelog

## 1.0.0

First release.

- TypeScript model generated from the official **DATEX II v3.7** JSON Schemas
  vendored in `schemas/datex2-v3.7/`: 19 namespaces, 1608 definitions, as both a
  wire model (`datex2-ts/wire`) and a friendly model (`datex2-ts/friendly`).
- `encode()` / `decode()` (and `toWire()` / `toFriendly()`) convert losslessly
  between the two, unwrapping enums, dropping technical `G` suffixes and
  flattening substitution groups into `_type`-discriminated unions.
- Metadata-driven validation: `validate`, `check`, `isValid`, `assertValid`.
- Immutable editing: `edit`, `setIn`, `updateIn`, `pushIn`, `deleteIn`, `getIn`,
  `select`, `prune`, `freeze`, `clone`.
- Envelope handling: `parse`, `serialize`, `toDocument`, `detectRoot`.
- Model introspection and traversal: `getDef`, `typeNames`, `membersOf`, `walk`,
  `collect`.
- `scripts/generate.mjs` retargets the whole library at any DATEX II v3 JSON
  Schema set - the Exchange/CIS package, an older model version, or a
  wizard-generated profile. It reads both draft-04 (`definitions`) and draft
  2020-12 (`$defs`).
