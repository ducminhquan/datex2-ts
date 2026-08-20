import { describe, expect, it } from 'vitest';
import {
  detectRoot,
  encode,
  parse,
  rootTypes,
  serialize,
  toDocument,
  validate,
} from '../src/index.js';
import { accidentPublication, genericPublication } from './fixtures.js';

describe('envelopes', () => {
  it('knows the roots the schemas declare', () => {
    expect(rootTypes['payload']).toBe('PayloadPublicationG');
  });

  it('detects the envelope of a raw document', () => {
    const doc = toDocument(accidentPublication, 'PayloadPublicationG') as Record<string, unknown>;
    expect(detectRoot(doc)).toMatchObject({ root: 'payload', type: 'PayloadPublicationG' });
    expect(detectRoot({ nothing: 1 })).toBeUndefined();
  });
});

describe('serialize / parse', () => {
  it('round-trips a publication through JSON text', () => {
    const json = serialize(accidentPublication, 'PayloadPublicationG', { space: 2 });
    const parsed = parse(json, 'PayloadPublicationG');
    expect(parsed.root).toBe('payload');
    expect(parsed.value).toEqual(accidentPublication);
  });

  it('round-trips a publication from another namespace', () => {
    const parsed = parse(serialize(genericPublication, 'PayloadPublicationG'));
    expect(parsed.type).toBe('PayloadPublicationG');
    expect(parsed.value).toEqual(genericPublication);
  });

  it('validates on demand', () => {
    expect(() =>
      serialize({ country: 'vn' } as never, 'InternationalIdentifier', { validate: true }),
    ).toThrow(/nationalIdentifier/);
  });

  it('accepts fragments when told which type they are', () => {
    const wire = encode('InternationalIdentifier', { country: 'vn', nationalIdentifier: 'HCMC' });
    expect(parse(wire, 'InternationalIdentifier').value).toEqual({
      country: 'vn',
      nationalIdentifier: 'HCMC',
    });
  });

  it('refuses to guess when there is no envelope', () => {
    expect(() => parse({ country: 'vn' })).toThrow(/Cannot determine/);
  });

  it('produces a document that satisfies the schema model', () => {
    const doc = toDocument(accidentPublication, 'PayloadPublicationG') as Record<string, unknown>;
    expect(validate(doc['payload'], 'PayloadPublicationG')).toEqual([]);
  });
});
