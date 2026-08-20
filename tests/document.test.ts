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
import { accidentMessage, accidentPublication } from './fixtures.js';

describe('envelopes', () => {
  it('knows the roots the schemas declare', () => {
    expect(rootTypes['payload']).toBe('PayloadPublicationG');
    expect(rootTypes['messageContainer']).toBe('MessageContainer');
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

  it('round-trips a full message container', () => {
    const json = serialize(accidentMessage, 'MessageContainer');
    const parsed = parse(json);
    expect(parsed.type).toBe('MessageContainer');
    expect(parsed.value).toEqual(accidentMessage);
  });

  it('validates on demand', () => {
    expect(() =>
      serialize({ country: 'se' } as never, 'InternationalIdentifier', { validate: true }),
    ).toThrow(/nationalIdentifier/);
  });

  it('accepts fragments when told which type they are', () => {
    const wire = encode('InternationalIdentifier', { country: 'se', nationalIdentifier: 'STA' });
    expect(parse(wire, 'InternationalIdentifier').value).toEqual({
      country: 'se',
      nationalIdentifier: 'STA',
    });
  });

  it('refuses to guess when there is no envelope', () => {
    expect(() => parse({ country: 'se' })).toThrow(/Cannot determine/);
  });

  it('produces a document that satisfies the schema model', () => {
    const doc = toDocument(accidentMessage, 'MessageContainer') as Record<string, unknown>;
    expect(validate(doc['messageContainer'], 'MessageContainer')).toEqual([]);
  });
});
