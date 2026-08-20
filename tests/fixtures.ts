import type { PayloadPublicationG } from '../src/friendly.js';

/**
 * The accident from the official DATEX II "Small Accident" example, written in
 * the friendly model instead of the JSON encoding.
 */
export const accidentPublication: PayloadPublicationG = {
  modelBaseVersion: '3',
  _type: 'SituationPublication',
  lang: 'se',
  publicationTime: '2018-10-11T15:00:00+02:00',
  publicationCreator: { country: 'se', nationalIdentifier: 'STA' },
  situation: [
    {
      id: '12345',
      headerInformation: { informationStatus: 'real' },
      situationRecord: [
        {
          _type: 'Accident',
          id: '2322',
          version: '1',
          situationRecordCreationTime: '2018-10-11T14:32:00+02:00',
          situationRecordVersionTime: '2018-10-11T14:32:00+02:00',
          probabilityOfOccurrence: 'certain',
          accidentType: ['accidentInvolvingHeavyLorries'],
          validity: {
            validityStatus: 'active',
            validityTimeSpecification: { overallStartTime: '2018-10-11T14:32:00+02:00' },
          },
          locationReference: {
            _type: 'PointLocation',
            alertCPoint: [
              {
                _type: 'AlertCMethod4Point',
                alertCLocationCountryCode: 'se',
                alertCLocationTableNumber: '33',
                alertCLocationTableVersion: '2.1',
                alertCDirection: {
                  alertCDirectionCoded: 'positive',
                  alertCAffectedDirection: 'both',
                },
                alertCMethod4PrimaryPointLocation: {
                  alertCLocation: { specificLocation: 1234 },
                  offsetDistance: { offsetDistance: 30 },
                },
              },
            ],
          },
        },
      ],
    },
  ],
};

import type { MessageContainer } from '../src/friendly.js';

/** A complete DATEX II message envelope carrying the accident publication. */
export const accidentMessage: MessageContainer = {
  payload: [accidentPublication],
  exchangeInformation: {
    messageType: 'payloadDelivery',
    exchangeContext: {
      codedExchangeProtocol: 'snapshotPull',
      exchangeSpecificationVersion: '3.5',
      supplierOrCisRequester: {
        name: 'Trafikverket',
        internationalIdentifier: { country: 'se', nationalIdentifier: 'STA' },
      },
    },
    dynamicInformation: {
      exchangeStatus: 'online',
      messageGenerationTimestamp: '2018-10-11T15:00:00+02:00',
    },
  },
};
