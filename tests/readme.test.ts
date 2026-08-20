import { describe, expect, it } from 'vitest';
import type { SituationRecordG } from '../src/friendly.js';
import {
  AccidentTypeEnum,
  decode,
  encode,
  encodeStrict,
  getDef,
  membersOf,
  namespaces,
  typeNames,
  typeNamesIn,
} from '../src/index.js';

/** Every claim the README makes about the shipped model. */
describe('README', () => {
  it('lists the members of a location reference group', () => {
    expect(membersOf('LocationReferenceG')).toEqual([
      'LinearLocation',
      'SingleRoadLinearLocation',
      'PointLocation',
    ]);
  });

  it('exposes enumerations as const objects', () => {
    expect(AccidentTypeEnum.collision).toBe('collision');
  });

  it('converts enums both ways', () => {
    expect(encode('InformationStatusEnumG', 'real')).toEqual({ value: 'real' });
    expect(decode('InformationStatusEnumG', { value: 'real' })).toBe('real');
    expect(
      encode('EmissionClassificationEuroEnumG', { value: 'extendedG', extendedValue: 'euro6d' }),
    ).toEqual({ value: 'extendedG', extendedValueG: 'euro6d' });
  });

  it('narrows a substitution group through _type', () => {
    const describeRecord = (record: SituationRecordG): string => {
      switch (record._type) {
        case 'Accident':
          return `${record.accidentType.join(', ')} at ${record.situationRecordCreationTime}`;
      }
    };
    expect(
      describeRecord({
        _type: 'Accident',
        id: '1',
        version: '1',
        situationRecordCreationTime: 'T0',
        situationRecordVersionTime: 'T0',
        probabilityOfOccurrence: 'certain',
        accidentType: ['collision'],
        validity: {
          validityStatus: 'active',
          validityTimeSpecification: { overallStartTime: 'T0' },
        },
        locationReference: { _type: 'PointLocation' },
      }),
    ).toBe('collision at T0');
  });

  it('ships 207 definitions across 11 namespaces', () => {
    expect(typeNames()).toHaveLength(207);
    expect(namespaces).toHaveLength(11);
    expect(typeNamesIn('Situation').length).toBeGreaterThan(0);
  });

  it('accepts a coordinate-based location (README.vi quickstart)', () => {
    const wire = encodeStrict('PayloadPublicationG', {
      modelBaseVersion: '3',
      _type: 'SituationPublication',
      lang: 'vi',
      publicationTime: '2026-08-20T14:32:00+07:00',
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
              accidentType: ['multipleVehicleAccident'],
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
    expect(wire).toHaveProperty('sitSituationPublication');
  });

  it('describes a type at runtime', () => {
    const def = getDef('Accident');
    expect(def).toMatchObject({ ns: 'Situation', name: 'Accident', kind: 'object' });
    expect(def.props?.find((p) => p.f === 'id')).toMatchObject({ w: 'idG', r: true });
  });
});
