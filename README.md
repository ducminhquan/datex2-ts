# datex2-ts

A dev-friendly TypeScript data model for **DATEX II v3** (JSON encoding).

DATEX II is the European standard for exchanging traffic and travel information.
Its JSON encoding is faithful to the UML model, which makes it precise - and
unpleasant to write by hand: technical `G` suffixes (`idG`, `versionG`), enums
wrapped as `{ "value": "real" }`, and substitution groups nested one property
deeper than you expect (`{ "sitAccident": { … } }`).

`datex2-ts` gives you **two views of the same model** and lossless conversion
between them:

| | wire (`datex2-ts/wire`) | friendly (`datex2-ts/friendly`) |
| --- | --- | --- |
| identifiers | `idG`, `versionG` | `id`, `version` |
| enums | `{ value: 'real' }` | `'real'` |
| substitution groups | `{ sitAccident: { … } }` | `{ _type: 'Accident', … }` |
| use it for | reading and writing DATEX II JSON | writing application code |

Everything - types, enums and the runtime metadata that drives conversion and
validation - is generated from the official **DATEX II v3.7** JSON Schemas
vendored in [`schemas/`](./schemas): 19 namespaces, 1608 definitions. Zero
runtime dependencies.

> 🇻🇳 Bản tiếng Việt: [README.vi.md](./README.vi.md)

## Install

```bash
npm install datex2-ts
```

## Quickstart

Write a situation publication in the friendly model, with full type checking and
completion:

```ts
import { create, encodeStrict, serialize } from 'datex2-ts';

const publication = create('PayloadPublicationG', {
  modelBaseVersion: '3',
  version: '3.7',
  _type: 'SituationPublication',
  lang: 'en',
  publicationTime: new Date().toISOString(),
  publicationCreator: { country: 'vn', nationalIdentifier: 'HCMC' },
  situation: [
    {
      id: '12345',
      headerInformation: { informationStatus: 'real' },
      situationRecord: [
        {
          _type: 'Accident',
          id: '2322',
          version: '1',
          situationRecordCreationTime: '2026-08-20T14:32:00+07:00',
          situationRecordVersionTime: '2026-08-20T14:32:00+07:00',
          probabilityOfOccurrence: 'certain',
          accidentType: ['accidentInvolvingHeavyLorries'],
          severity: 'high',
          validity: {
            validityStatus: 'active',
            validityTimeSpecification: { overallStartTime: '2026-08-20T14:32:00+07:00' },
          },
          locationReference: {
            _type: 'PointLocation',
            pointByCoordinates: {
              pointCoordinates: { latitude: 10.7769, longitude: 106.7009 },
            },
          },
        },
      ],
    },
  ],
});

// -> DATEX II JSON, throwing if the model is not satisfied
const wire = encodeStrict('PayloadPublicationG', publication);

// -> a complete document, wrapped in its `payload` envelope
const json = serialize(publication, 'PayloadPublicationG', { space: 2, validate: true });
```

`PayloadPublicationG` is the substitution group of every DATEX II publication, so
the same call builds a `ParkingTablePublication`, an
`EnergyInfrastructureStatusPublication`, a `VmsPublication` and so on - just
change `_type`.

Read one back:

```ts
import { collect, encode, parse } from 'datex2-ts';

const { type, value } = parse(json); // envelope detected automatically
value.situation?.[0]?.situationRecord[0]; // -> { _type: 'Accident', id: '2322', … }

// find every instance of a type anywhere in a document (wire encoding)
const accidents = collect(encode(type, value), type, 'Accident');
```

## The friendly model

### Enums are plain strings

```ts
import { AccidentTypeEnum, decode, encode } from 'datex2-ts';

encode('InformationStatusEnumG', 'real');          // { value: 'real' }
decode('InformationStatusEnumG', { value: 'real' }); // 'real'

AccidentTypeEnum.collision; // 'collision' - const object for runtime use
```

DATEX II lets a profile extend an enumeration. That still round-trips, with the
technical name cleaned up:

```ts
encode('EmissionClassificationEuroEnumG', { value: 'extendedG', extendedValue: 'euro6d' });
// { value: 'extendedG', extendedValueG: 'euro6d' }
```

### Substitution groups are discriminated unions

A DATEX II choice is a wrapper object with one property per possible subclass.
In the friendly model it becomes a `_type`-tagged union, so `switch` narrowing
just works:

```ts
import type { SituationRecordG } from 'datex2-ts/friendly';

function describe(record: SituationRecordG): string {
  switch (record._type) {
    case 'Accident':
      return `${record.accidentType.join(', ')} at ${record.situationRecordCreationTime}`;
    case 'ConstructionWorks':
      return `construction works, ${record.validity.validityStatus}`;
    default:
      return record._type;
  }
}
```

Ask the model which members a group accepts:

```ts
import { membersOf } from 'datex2-ts';
membersOf('LocationReferenceG');
// ['LocationGroupByList', 'LocationGroupByReference', 'ItineraryByIndexedLocations',
//  'ItineraryByReference', 'LinearLocation', 'SingleRoadLinearLocation',
//  'PointLocation', 'PointLocationForParking', 'LocationByReference', 'AreaLocation']
```

### Forgiving input

`encode()` / `toWire()` accept, in addition to the friendly shape:

- wire property names (`idG` as well as `id`), so partially-migrated data works;
- a single value where the model expects a list - it is lifted into an array;
- `Date` objects wherever a date-time string is expected;
- properties the model does not declare, which are copied through untouched so
  profile and extension data survives a round trip (pass `{ strict: true }` to
  drop them instead).

## Changing fields

### `edit()` - type-safe, immutable

```ts
import { edit } from 'datex2-ts';

const next = edit(publication, (draft) => {
  const record = draft.situation![0]!.situationRecord[0]!;
  if (record._type === 'Accident') {
    record.accidentType = ['multipleVehicleAccident'];
    record.totalNumberOfVehiclesInvolved = 3;
  }
});
// `publication` is untouched
```

### Paths - for dynamic access

Dot-separated paths address deeply nested values without a chain of `?.`. Writes
are immutable and create missing parents on the way:

```ts
import { getIn, pushIn, select, setIn, updateIn, deleteIn } from 'datex2-ts';

const at = 'situation.0.situationRecord.0';

getIn(publication, `${at}.id`);                               // '2322'
setIn(publication, `${at}.version`, '2');                     // new copy
updateIn(publication, `${at}.version`, (v) => String(+v! + 1));
pushIn(publication, `${at}.accidentType`, 'secondaryAccident');
deleteIn(publication, `${at}.collisionType`);

setIn({}, 'situation.0.situationRecord.0.id', '7');
// { situation: [{ situationRecord: [{ id: '7' }] }] }

select(publication, 'situation.*.situationRecord.*._type'); // ['Accident']
```

Other helpers: `hasIn`, `clone`, `freeze`, and `prune` (drops `undefined`,
`null` and empty containers before serialising).

## Validation

Validation is driven by the same generated metadata, so it needs no JSON Schema
validator at runtime and reports issues in model terms.

```ts
import { assertValid, check, isValid, validate } from 'datex2-ts';

validate(wire, 'PayloadPublicationG');   // Issue[] on the wire encoding
check('PayloadPublicationG', friendly);  // Issue[] on the friendly model
isValid(wire, 'PayloadPublicationG');
assertValid(wire, 'PayloadPublicationG'); // throws ValidationError
```

Each `Issue` carries `{ path, code, message, type }`. Codes cover
`missingRequired`, `unknownProperty`, `wrongType`, `notAnArray`, `tooFewItems`,
`tooManyItems`, `notInEnum`, `emptyChoice`, `ambiguousChoice`, `outOfRange`,
`tooLong`, `patternMismatch` and `unknownType`.

Options: `reportUnknown` (default `true`) and `maxIssues`.

If you would rather validate with a JSON Schema validator, the schemas ship with
the package:

```ts
import common from 'datex2-ts/schemas/datex2-v3.7/DATEXII_3_Common.json' with { type: 'json' };
```

## Documents and envelopes

```ts
import { detectRoot, parse, rootTypes, serialize, toDocument } from 'datex2-ts';

rootTypes;                       // { payload: 'PayloadPublicationG' }
detectRoot(doc);                 // { root, type, value } or undefined
parse(jsonOrObject);             // envelope detected
parse(fragment, 'Accident');     // explicit type for envelope-less fragments
toDocument(value, type);         // wire value wrapped in its envelope
serialize(value, type, { space: 2, validate: true });
```

## Inspecting the model at runtime

```ts
import { defs, getDef, namespaces, typeNames, typeNamesIn } from 'datex2-ts';

typeNames().length;               // every generated type
typeNamesIn('Situation');         // types from one DATEX II namespace
getDef('Accident');               // { ns, name, kind, props, open, … }
getDef('Accident').props?.map((p) => `${p.f} (${p.w})${p.r ? ' *' : ''}`);
```

`walk(value, type, visitor)` traverses a wire document guided by the model, and
`collect` / `collectWithPaths` are built on it.

## Which DATEX II model is included

The bundled model is generated from the official **DATEX II version 3.7 model
package** (<https://docs.datex2.eu/downloads/modelv37/>): 19 namespaces, 1608
definitions, covering `Situation`, `Parking`, `EnergyInfrastructure`,
`AfirEnergyInfrastructure`, `Facilities`, `AfirFacilities`, `RoadTrafficData`,
`Vms`, `TrafficRegulation`, `TrafficManagementPlan`, `ControlledZone`,
`FaultAndStatus`, `ReroutingManagementEnhanced`, `LocationReferencing`,
`UrbanExtensions` and the `Common` namespaces.

The DATEX II **Exchange / CIS** namespaces (`MessageContainer`,
`ExchangeInformation`) are published as a separate package and are not part of
the model download, so this release covers payload publications rather than
message envelopes.

**The generator is not tied to that set.** Point it at the Exchange package, an
older model version, or your own wizard-generated profile, and everything -
types, enums, metadata, validation - follows:

```bash
node scripts/generate.mjs schemas/my-profile
npm run typecheck && npm test
```

It understands both dialects the DATEX II tooling emits: draft-04 with
`definitions` and draft 2020-12 with `$defs`. See
[`schemas/README.md`](./schemas/README.md) for details.

## Scope

- Covers the **JSON** encoding of DATEX II v3. XML/XSD is out of scope.
- Validation checks what the DATEX II JSON Schemas express (structure, required
  properties, enumerations, ranges, lengths, patterns, list bounds). It does not
  check the standard's prose-level rules.
- Importing only types (`datex2-ts/friendly`, `datex2-ts/wire`) costs nothing at
  runtime. Importing the runtime pulls in the generated metadata for all 1608
  definitions - roughly 1 MB unminified, which your bundler will compress and
  which matters mostly in the browser.

## Development

```bash
npm install
npm run generate    # regenerate src/generated/ from schemas/
npm run typecheck
npm test
npm run build
```

`src/generated/` is committed and CI fails if it drifts from the schemas.

## License

MIT
