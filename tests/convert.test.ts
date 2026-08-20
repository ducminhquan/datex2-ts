import { describe, expect, it } from 'vitest';
import { decode, encode, toFriendly, toWire } from '../src/index.js';
import { accidentPublication } from './fixtures.js';

describe('enum wrappers', () => {
  it('wraps a plain value on the way out', () => {
    expect(toWire('real', 'InformationStatusEnumG')).toEqual({ value: 'real' });
  });

  it('unwraps a plain value on the way in', () => {
    expect(toFriendly({ value: 'real' }, 'InformationStatusEnumG')).toBe('real');
  });

  it('keeps extended values addressable', () => {
    const wire = toWire(
      { value: 'extendedG', extendedValue: 'euro6d' },
      'EmissionClassificationEuroEnumG',
    );
    expect(wire).toEqual({ value: 'extendedG', extendedValueG: 'euro6d' });
    expect(toFriendly(wire, 'EmissionClassificationEuroEnumG')).toEqual({
      value: 'extendedG',
      extendedValue: 'euro6d',
    });
  });
});

describe('technical G suffixes', () => {
  it('renames id/version on the way out and back', () => {
    const wire = encode('Situation', {
      id: '12345',
      headerInformation: { informationStatus: 'real' },
      situationRecord: [],
    });
    expect(wire).toMatchObject({ idG: '12345' });
    expect(decode('Situation', wire).id).toBe('12345');
  });
});

describe('substitution groups', () => {
  it('flattens the chosen member behind _type', () => {
    const wire = { sitAccident: { idG: '1' } };
    const friendly = toFriendly(wire, 'SituationRecordG') as Record<string, unknown>;
    expect(friendly['_type']).toBe('Accident');
    expect(friendly['id']).toBe('1');
    expect(toWire(friendly, 'SituationRecordG')).toEqual(wire);
  });

  it('keeps group-level attributes beside the member', () => {
    const wire = toWire(accidentPublication, 'PayloadPublicationG') as Record<string, unknown>;
    expect(wire['modelBaseVersionG']).toBe('3');
    expect(wire).toHaveProperty('sitSituationPublication');
  });
});

describe('lenient input', () => {
  it('lifts a single value into a repeated property', () => {
    const wire = toWire(
      { idG: '1', headerInformation: { informationStatus: 'real' }, situationRecord: [] },
      'Situation',
    ) as Record<string, unknown>;
    expect(wire['idG']).toBe('1');
  });

  it('accepts wire property names too', () => {
    const wire = encode('InternationalIdentifier', {
      country: 'se',
      nationalIdentifier: 'STA',
    });
    expect(wire).toEqual({ country: 'se', nationalIdentifier: 'STA' });
  });

  it('serialises Date instances into date-time strings', () => {
    const when = new Date('2018-10-11T13:00:00.000Z');
    const wire = toWire(
      { lang: 'se', publicationTime: when, publicationCreator: { country: 'se', nationalIdentifier: 'STA' } },
      'SituationPublication',
    ) as Record<string, unknown>;
    expect(wire['publicationTime']).toBe('2018-10-11T13:00:00.000Z');
  });
});

describe('round trip', () => {
  it('survives friendly -> wire -> friendly unchanged', () => {
    const wire = encode('PayloadPublicationG', accidentPublication);
    const back = decode('PayloadPublicationG', wire);
    expect(back).toEqual(accidentPublication);
  });

  it('survives wire -> friendly -> wire unchanged', () => {
    const wire = encode('PayloadPublicationG', accidentPublication);
    expect(encode('PayloadPublicationG', decode('PayloadPublicationG', wire))).toEqual(wire);
  });

  it('preserves unknown properties unless strict', () => {
    const wire = { idG: '1', profileOnlyField: 42 };
    const friendly = toFriendly(wire, 'Reference') as Record<string, unknown>;
    expect(friendly['profileOnlyField']).toBe(42);
    expect(toFriendly(wire, 'Reference', { strict: true })).toEqual({ id: '1' });
  });
});
