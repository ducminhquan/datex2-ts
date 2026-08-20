# Vendored DATEX II JSON Schemas

`datex2-ts` generates its entire TypeScript model from the JSON Schemas in this
directory. Nothing here is edited by hand.

## What is currently vendored

`datex2-v3/` holds the DATEX II v3 JSON Schema set published by the DATEX II
programme in the official
[UF2024 OpenAPI-and-JSON workshop repository](https://github.com/DATEX-II-EU/UF2024-OpenAPI-and-JSON/tree/main/Schema_Small_Accident)
(`Schema_Small_Accident`). It is a *profile* of the DATEX II v3 model produced by
the [DATEX II schema wizard](https://webtool.datex2.eu/wizard/), covering these
namespaces:

| File | Namespace |
| --- | --- |
| `DATEXII_3_Common.json` | Common |
| `DATEXII_3_CommonExtension.json` | CommonExtension |
| `DATEXII_3_CISInformation.json` | CISInformation |
| `DATEXII_3_D2Payload.json` | D2Payload |
| `DATEXII_3_ExchangeInformation.json` | ExchangeInformation |
| `DATEXII_3_InformationManagement.json` | InformationManagement |
| `DATEXII_3_LocationExtension.json` | LocationExtension |
| `DATEXII_3_LocationReferencing.json` | LocationReferencing |
| `DATEXII_3_MessageContainer.json` | MessageContainer |
| `DATEXII_3_Parking.json` | Parking |
| `DATEXII_3_Situation.json` | Situation |

It carries the full Common, ExchangeInformation and LocationReferencing
namespaces plus the Situation subset needed for accident publications - enough
to exercise every structural pattern DATEX II v3 uses (substitution groups,
enum wrappers, extension containers, technical `G` attributes).

## Retargeting at the full v3.7 model, or at your own profile

The generator is schema-driven, so any DATEX II v3 JSON Schema set works:

1. Download the JSON Schemas for the model or profile you need - the official
   full model lives at <https://docs.datex2.eu/downloads/modelv37/>, and the
   [schema wizard](https://webtool.datex2.eu/wizard/) generates profile-specific
   sets.
2. Drop the `DATEXII_3_*.json` files into a directory, e.g. `schemas/datex2-v37/`.
3. Regenerate and verify:

   ```bash
   node scripts/generate.mjs schemas/datex2-v37
   npm run typecheck && npm test
   ```

`scripts/generate.mjs` takes `[schemaDir] [outDir]`, so you can also generate a
model into your own project instead of into `src/generated/`.

Nothing in `src/runtime/` hard-codes a namespace, a class name or a property
prefix; it all reads the generated metadata. Note that the property prefixes for
substitution-group members (`sitAccident`, `locPointLocation`, …) are chosen by
the wizard when the schema set is produced, so they can differ between two sets
that describe the same model - another reason the runtime derives them from the
schemas rather than assuming them.
