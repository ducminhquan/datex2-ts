# Vendored DATEX II JSON Schemas

`datex2-ts` generates its entire TypeScript model from the JSON Schemas in this
directory. Nothing here is edited by hand.

## What is currently vendored

`datex2-v3.7/` holds the official **DATEX II version 3.7 model** schema package
from <https://docs.datex2.eu/downloads/modelv37/> - 19 namespaces, 1608
definitions, JSON Schema draft 2020-12:

| Namespace | Namespace |
| --- | --- |
| `AfirEnergyInfrastructure` | `Parking` |
| `AfirFacilities` | `ReroutingManagementEnhanced` |
| `Common` | `RoadTrafficData` |
| `CommonExtension` | `Situation` |
| `ControlledZone` | `TrafficManagementPlan` |
| `D2Payload` | `TrafficRegulation` |
| `EnergyInfrastructure` | `UrbanExtensions` |
| `Facilities` | `Vms` |
| `FaultAndStatus` | |
| `LocationExtension` | |
| `LocationReferencing` | |

This is the model (payload) package. The DATEX II **Exchange / CIS** namespaces -
`MessageContainer`, `ExchangeInformation`, `CISInformation`,
`InformationManagement` - ship as a separate download and are not part of it, so
the generated model covers payload publications rather than message envelopes.
Adding them is just a matter of dropping their schema files in here and
regenerating.

## Retargeting at another model or profile

The generator is schema-driven and understands both dialects the DATEX II
tooling emits - draft-04 with `definitions` and draft 2020-12 with `$defs` - so
any DATEX II v3 JSON Schema set works:

1. Get the schemas you need: the official model packages live at
   <https://docs.datex2.eu/downloads/>, and the
   [schema wizard](https://webtool.datex2.eu/wizard/) generates profile-specific
   sets.
2. Drop the `DATEXII_3_*.json` files into a directory, e.g. `schemas/my-profile/`.
3. Regenerate and verify:

   ```bash
   node scripts/generate.mjs schemas/my-profile
   npm run typecheck && npm test
   ```

`scripts/generate.mjs` takes `[schemaDir] [outDir]`, so you can also generate a
model into your own project instead of into `src/generated/`.

Nothing in `src/runtime/` hard-codes a namespace, a class name or a property
prefix; it all reads the generated metadata. Note in particular that the
property prefixes for substitution-group members (`sitAccident`,
`locPointLocation`, `egiEnergyInfrastructureTablePublication`, …) are chosen
when the schema set is produced, so they differ between packages that describe
the same model - another reason the runtime derives them from the schemas
rather than assuming them.
