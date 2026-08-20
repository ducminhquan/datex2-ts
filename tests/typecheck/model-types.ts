/**
 * Compile-time assertions about the generated friendly model. This file has no
 * runtime tests: `npm run typecheck` fails if any `@ts-expect-error` below
 * stops being an error, or if any accepted value stops compiling.
 */
import type {
  PayloadPublicationG,
  PlaceStatus,
  SituationPublication,
  SituationRecordG,
} from '../../src/friendly.js';

/* -- accepted ------------------------------------------------------------- */

export const publication: PayloadPublicationG = {
  modelBaseVersion: '3',
  _type: 'SituationPublication',
  lang: 'en',
  publicationTime: 'T',
  publicationCreator: { country: 'vn', nationalIdentifier: 'X' },
};

export const place: PlaceStatus = { reference: { targetClass: 'ParkingRecord', id: 'p1' } };

/** `_type` narrows a substitution group down to one member. */
export function narrow(record: SituationRecordG): string {
  switch (record._type) {
    case 'Accident':
      return record.accidentType.join(',');
    case 'ConstructionWorks':
      return record.validity.validityStatus.toString();
    default:
      return record._type;
  }
}

/* -- rejected ------------------------------------------------------------- */

// @ts-expect-error `lang` is mandatory on a SituationPublication
export const missingRequired: SituationPublication = {
  publicationTime: 'T',
  publicationCreator: { country: 'vn', nationalIdentifier: 'X' },
};

export const unknownProperty: SituationPublication = {
  lang: 'en',
  publicationTime: 'T',
  publicationCreator: { country: 'vn', nationalIdentifier: 'X' },
  // @ts-expect-error the model declares no such property
  totallyBogusProperty: 1,
};

export const missingNestedRequired: PayloadPublicationG = {
  modelBaseVersion: '3',
  _type: 'ParkingStatusPublication',
  lang: 'en',
  publicationTime: 'T',
  publicationCreator: { country: 'vn', nationalIdentifier: 'X' },
  // @ts-expect-error PlaceStatus requires `reference`
  parkingStatusInformation: [{ _type: 'PlaceStatus' }],
};

export const badEnumValue: SituationPublication = {
  lang: 'en',
  publicationTime: 'T',
  publicationCreator: { country: 'vn', nationalIdentifier: 'X' },
  // @ts-expect-error not a member of the feed type / situation list
  situation: [{ id: '1', headerInformation: { informationStatus: 'nonsense' }, situationRecord: [] }],
};

export const badChoiceMember: PayloadPublicationG = {
  modelBaseVersion: '3',
  // @ts-expect-error no such member of the payload substitution group
  _type: 'NotAPublication',
};
