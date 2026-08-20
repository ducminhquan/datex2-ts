import { describe, expect, it } from 'vitest';
import {
  ValidationError,
  assertValid,
  check,
  encode,
  isValid,
  validate,
} from '../src/index.js';
import { accidentPublication } from './fixtures.js';

const wire = encode('PayloadPublicationG', accidentPublication);

describe('validate', () => {
  it('accepts the reference publication', () => {
    expect(validate(wire, 'PayloadPublicationG')).toEqual([]);
    expect(isValid(wire, 'PayloadPublicationG')).toBe(true);
  });

  it('reports a missing mandatory property', () => {
    const issues = validate({ country: 'se' }, 'InternationalIdentifier');
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      code: 'missingRequired',
      path: 'nationalIdentifier',
    });
  });

  it('reports a value outside the enumeration', () => {
    const issues = validate({ value: 'nonsense' }, 'InformationStatusEnumG');
    expect(issues[0]?.code).toBe('notInEnum');
  });

  it('reports properties the model does not declare', () => {
    const issues = validate(
      { country: 'se', nationalIdentifier: 'STA', typo: 1 },
      'InternationalIdentifier',
    );
    expect(issues[0]).toMatchObject({ code: 'unknownProperty', path: 'typo' });
    expect(validate(
      { country: 'se', nationalIdentifier: 'STA', typo: 1 },
      'InternationalIdentifier',
      { reportUnknown: false },
    )).toEqual([]);
  });

  it('enforces string length from the schema', () => {
    const issues = validate(
      { country: 'sweden', nationalIdentifier: 'STA' },
      'InternationalIdentifier',
    );
    expect(issues[0]).toMatchObject({ code: 'tooLong', path: 'country' });
  });

  it('enforces numeric ranges from the schema', () => {
    expect(validate(400, 'AngleInDegrees')[0]?.code).toBe('outOfRange');
    expect(validate(180, 'AngleInDegrees')).toEqual([]);
  });

  it('enforces minItems on repeated properties', () => {
    const issues = validate(
      {
        idG: '1',
        headerInformation: { informationStatus: { value: 'real' } },
        situationRecord: [],
      },
      'Situation',
    );
    expect(issues[0]).toMatchObject({ code: 'tooFewItems', path: 'situationRecord' });
  });

  it('requires exactly one member of a substitution group', () => {
    expect(validate({}, 'SituationRecordG')[0]?.code).toBe('emptyChoice');
  });

  it('stops early when maxIssues is set', () => {
    expect(validate({}, 'Accident', { maxIssues: 2 })).toHaveLength(2);
  });

  it('validates friendly values through check()', () => {
    expect(check('PayloadPublicationG', accidentPublication)).toEqual([]);
    expect(
      check('InternationalIdentifier', { country: 'se' } as never).map((i) => i.code),
    ).toEqual(['missingRequired']);
  });
});

describe('assertValid', () => {
  it('returns the value when it is valid', () => {
    expect(assertValid(wire, 'PayloadPublicationG')).toBe(wire);
  });

  it('throws a ValidationError listing the issues', () => {
    try {
      assertValid({}, 'InternationalIdentifier');
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).issues).toHaveLength(2);
      expect((error as ValidationError).message).toContain('nationalIdentifier');
    }
  });
});
