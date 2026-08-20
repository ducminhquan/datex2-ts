import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse, toDocument, validate } from '../src/index.js';
import { accidentMessage, accidentPublication } from './fixtures.js';

const read = (file: string) => JSON.parse(readFileSync(`examples/${file}`, 'utf8'));

describe('shipped examples', () => {
  it('match what the library produces today', () => {
    expect(read('situation-accident.json')).toEqual(
      toDocument(accidentPublication, 'PayloadPublicationG'),
    );
    expect(read('message-container.json')).toEqual(
      toDocument(accidentMessage, 'MessageContainer'),
    );
  });

  it('satisfy the model', () => {
    const doc = read('message-container.json');
    expect(validate(doc.messageContainer, 'MessageContainer')).toEqual([]);
  });

  it('decode back into the friendly model', () => {
    expect(parse(read('situation-accident.json')).value).toEqual(accidentPublication);
  });
});
