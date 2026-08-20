import { describe, expect, it } from 'vitest';
import {
  deleteIn,
  formatPath,
  getIn,
  hasIn,
  parsePath,
  pushIn,
  select,
  setIn,
  updateIn,
} from '../src/index.js';
import { accidentPublication } from './fixtures.js';

const RECORD = 'situation.0.situationRecord.0';

describe('parsePath', () => {
  it('turns numeric segments into indices', () => {
    expect(parsePath('situation.0.id')).toEqual(['situation', 0, 'id']);
    expect(parsePath([])).toEqual([]);
    expect(formatPath(['situation', 0, 'id'])).toBe('situation.0.id');
  });
});

describe('getIn', () => {
  it('reads through arrays and objects', () => {
    expect(getIn(accidentPublication, `${RECORD}.id`)).toBe('2322');
    expect(hasIn(accidentPublication, `${RECORD}.id`)).toBe(true);
  });

  it('returns undefined instead of throwing on a missing branch', () => {
    expect(getIn(accidentPublication, 'situation.9.nothing.here')).toBeUndefined();
    expect(hasIn(accidentPublication, 'nope')).toBe(false);
  });
});

describe('setIn', () => {
  it('leaves the original untouched', () => {
    const next = setIn(accidentPublication, `${RECORD}.version`, '2');
    expect(getIn(next, `${RECORD}.version`)).toBe('2');
    expect(getIn(accidentPublication, `${RECORD}.version`)).toBe('1');
  });

  it('shares untouched branches', () => {
    const next = setIn(accidentPublication, `${RECORD}.version`, '2');
    expect(next.publicationCreator).toBe(accidentPublication.publicationCreator);
  });

  it('creates missing objects and arrays along the way', () => {
    const built = setIn({}, 'situation.0.situationRecord.0.id', '7');
    expect(built).toEqual({ situation: [{ situationRecord: [{ id: '7' }] }] });
  });
});

describe('updateIn / pushIn / deleteIn', () => {
  it('updates in place immutably', () => {
    const next = updateIn(accidentPublication, `${RECORD}.version`, (v) => String(Number(v) + 1));
    expect(getIn(next, `${RECORD}.version`)).toBe('2');
  });

  it('appends to a list, creating it when absent', () => {
    const next = pushIn(accidentPublication, `${RECORD}.accidentType`, 'multipleVehicleAccident');
    expect(getIn(next, `${RECORD}.accidentType`)).toEqual([
      'accidentInvolvingHeavyLorries',
      'multipleVehicleAccident',
    ]);
    expect(pushIn({}, 'a.b', 1)).toEqual({ a: { b: [1] } });
  });

  it('removes object properties and array elements', () => {
    expect(deleteIn(accidentPublication, `${RECORD}.version`)).not.toHaveProperty(
      'situation.0.situationRecord.0.version',
    );
    expect(deleteIn({ a: [1, 2, 3] }, 'a.1')).toEqual({ a: [1, 3] });
  });
});

describe('select', () => {
  it('expands wildcards', () => {
    expect(select(accidentPublication, 'situation.*.situationRecord.*.id')).toEqual(['2322']);
    expect(select(accidentPublication, 'situation.*.situationRecord.*._type')).toEqual([
      'Accident',
    ]);
  });

  it('returns an empty list when nothing matches', () => {
    expect(select(accidentPublication, 'situation.*.missing.*')).toEqual([]);
  });
});
