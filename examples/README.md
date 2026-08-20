# Examples

| File | What it is |
| --- | --- |
| `situation-accident.json` | A `SituationPublication` carrying one accident located by coordinates. |
| `generic-publication.json` | A minimal `GenericPublication`, showing a different member of the payload substitution group. |

Both are wrapped in the `payload` envelope declared by `DATEXII_3_D2Payload.json`.

They are produced by the library itself from the fixtures in
`tests/fixtures.ts`, and `tests/examples.test.ts` fails if they drift.

Read one with:

```ts
import { readFileSync } from 'node:fs';
import { parse } from 'datex2-ts';

const { type, value } = parse(readFileSync('examples/situation-accident.json', 'utf8'));
```
