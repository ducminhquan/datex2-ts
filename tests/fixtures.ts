import type { PayloadPublicationG } from '../src/friendly.js';

/**
 * A situation publication carrying one accident, written in the friendly model
 * instead of the DATEX II JSON encoding.
 */
export const accidentPublication: PayloadPublicationG = {
  modelBaseVersion: '3',
  version: '3.7',
  _type: 'SituationPublication',
  lang: 'en',
  publicationTime: '2026-08-20T15:00:00+07:00',
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
};

/**
 * A minimal publication from a different namespace, so the fixtures exercise
 * more than one member of the payload substitution group.
 */
export const genericPublication: PayloadPublicationG = {
  modelBaseVersion: '3',
  _type: 'GenericPublication',
  lang: 'en',
  publicationTime: '2026-08-20T15:00:00+07:00',
  publicationCreator: { country: 'vn', nationalIdentifier: 'HCMC' },
  genericPublicationName: 'roadworksFeed',
};
