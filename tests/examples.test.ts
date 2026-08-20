import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse, toDocument, validate } from '../src/index.js';
import { accidentPublication, genericPublication } from './fixtures.js';

const read = (file: string) => JSON.parse(readFileSync(`examples/${file}`, 'utf8'));

describe('shipped examples', () => {
  it('match what the library produces today', () => {
    expect(read('situation-accident.json')).toEqual(
      toDocument(accidentPublication, 'PayloadPublicationG'),
    );
    expect(read('generic-publication.json')).toEqual(
      toDocument(genericPublication, 'PayloadPublicationG'),
    );
  });

  it('satisfy the model', () => {
    expect(validate(read('situation-accident.json').payload, 'PayloadPublicationG')).toEqual([]);
    expect(validate(read('generic-publication.json').payload, 'PayloadPublicationG')).toEqual([]);
  });

  it('decode back into the friendly model', () => {
    expect(parse(read('situation-accident.json')).value).toEqual(accidentPublication);
  });
});
