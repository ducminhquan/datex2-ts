# Examples

| File | Envelope | What it is |
| --- | --- | --- |
| `situation-accident.json` | `payload` | A `SituationPublication` carrying one accident, located with an AlertC method 4 point. |
| `message-container.json` | `messageContainer` | The same publication inside a full DATEX II message envelope with `exchangeInformation`. |

Both files are produced by the library itself from the fixtures in
`tests/fixtures.ts`, and `tests/examples.test.ts` fails if they drift. The
accident is the one from the official DATEX II "Small Accident" workshop
example, re-encoded against the schema set vendored in `schemas/`.

Read them with:

```ts
import { readFileSync } from 'node:fs';
import { parse } from 'datex2-ts';

const { type, value } = parse(readFileSync('examples/message-container.json', 'utf8'));
```
