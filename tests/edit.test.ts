import { describe, expect, it } from 'vitest';
import { clone, edit, freeze, prune } from '../src/index.js';
import { accidentPublication } from './fixtures.js';

describe('edit', () => {
  it('mutates a draft and leaves the input alone', () => {
    const next = edit(accidentPublication, (draft) => {
      const record = draft.situation![0]!.situationRecord[0]!;
      if (record._type === 'Accident') {
        record.accidentType = ['multipleVehicleAccident'];
        record.totalNumberOfVehiclesInvolved = 3;
      }
    });
    const before = accidentPublication.situation![0]!.situationRecord[0]!;
    const after = next.situation![0]!.situationRecord[0]!;
    expect(after._type === 'Accident' && after.totalNumberOfVehiclesInvolved).toBe(3);
    expect(before._type === 'Accident' && before.accidentType).toEqual([
      'accidentInvolvingHeavyLorries',
    ]);
  });

  it('accepts a replacement returned from the recipe', () => {
    expect(edit({ a: 1 }, () => ({ a: 2 }))).toEqual({ a: 2 });
  });
});

describe('clone', () => {
  it('copies nested structures and dates', () => {
    const source = { when: new Date(0), list: [{ x: 1 }] };
    const copy = clone(source);
    expect(copy).toEqual(source);
    expect(copy.list[0]).not.toBe(source.list[0]);
    expect(copy.when).not.toBe(source.when);
  });
});

describe('freeze', () => {
  it('freezes the whole tree', () => {
    const frozen = freeze({ a: { b: 1 } }) as { a: { b: number } };
    expect(Object.isFrozen(frozen.a)).toBe(true);
  });
});

describe('prune', () => {
  it('drops empty branches', () => {
    expect(
      prune({ a: undefined, b: null, c: [], d: {}, e: 0, f: '', g: { h: [] }, i: [1] }),
    ).toEqual({ e: 0, f: '', i: [1] });
  });
});
