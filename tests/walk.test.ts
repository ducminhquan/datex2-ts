import { describe, expect, it } from 'vitest';
import { collect, collectWithPaths, encode, walk } from '../src/index.js';
import { accidentPublication } from './fixtures.js';

const wire = encode('PayloadPublicationG', accidentPublication);

describe('walk', () => {
  it('visits nested nodes with their DATEX II type', () => {
    const types = new Set<string>();
    walk(wire, 'PayloadPublicationG', (node) => {
      types.add(node.type);
    });
    expect(types).toContain('Accident');
    expect(types).toContain('SituationPublication');
    expect(types).toContain('PointByCoordinates');
  });

  it('skips a subtree when the visitor returns false', () => {
    const seen: string[] = [];
    walk(wire, 'PayloadPublicationG', (node) => {
      seen.push(node.type);
      if (node.type === 'SituationPublication') return false;
      return undefined;
    });
    expect(seen).not.toContain('Accident');
  });
});

describe('collect', () => {
  it('gathers every instance of a type', () => {
    const accidents = collect(wire, 'PayloadPublicationG', 'Accident');
    expect(accidents).toHaveLength(1);
    expect(accidents[0]?.idG).toBe('2322');
  });

  it('reports where each match sits', () => {
    const [hit] = collectWithPaths(wire, 'PayloadPublicationG', 'Accident');
    expect(hit?.path).toBe('sitSituationPublication.situation.0.situationRecord.0.sitAccident');
  });
});
