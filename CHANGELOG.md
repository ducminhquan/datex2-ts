# Changelog

## 1.0.0

First release.

- TypeScript model generated from the vendored DATEX II v3 JSON Schemas:
  207 definitions across 11 namespaces, as both a wire model
  (`datex2-ts/wire`) and a friendly model (`datex2-ts/friendly`).
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
  Schema set, including the full v3.7 model or a wizard-generated profile.
