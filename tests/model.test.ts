import { describe, expect, it } from 'vitest';
import {
  defs,
  findDef,
  friendlyName,
  getDef,
  membersOf,
  namespaces,
  rootTypes,
  typeNames,
  typeNamesIn,
  UnknownTypeError,
} from '../src/index.js';

const names = typeNames();

describe('generated model integrity', () => {
  it('assigns every type to one of the declared namespaces', () => {
    expect(namespaces.length).toBeGreaterThan(0);
    const grouped = namespaces.flatMap((ns) => typeNamesIn(ns));
    expect(grouped.sort()).toEqual([...names].sort());
  });

  it('resolves every property reference', () => {
    for (const name of names) {
      for (const p of getDef(name).props ?? []) {
        if (p.t) expect(findDef(p.t), `${name}.${p.w} -> ${p.t}`).toBeDefined();
      }
    }
  });

  it('resolves every substitution group member', () => {
    for (const name of names) {
      for (const c of getDef(name).choices ?? []) {
        expect(findDef(c.t), `${name}.${c.w} -> ${c.t}`).toBeDefined();
      }
    }
  });

  it('resolves every scalar alias', () => {
    for (const name of names) {
      const base = getDef(name).base;
      if (base) expect(findDef(base), `${name} -> ${base}`).toBeDefined();
    }
  });

  it('resolves every declared root', () => {
    for (const [root, type] of Object.entries(rootTypes)) {
      expect(findDef(type), `${root} -> ${type}`).toBeDefined();
    }
  });

  it('keeps wire and friendly property names unambiguous', () => {
    for (const name of names) {
      const def = getDef(name);
      const wire = new Set((def.props ?? []).map((p) => p.w));
      const friendly = new Set((def.props ?? []).map(friendlyName));
      expect(wire.size, `${name} wire names`).toBe((def.props ?? []).length);
      expect(friendly.size, `${name} friendly names`).toBe((def.props ?? []).length);
    }
  });

  it('never lets a choice member collide with its group attributes', () => {
    for (const name of names) {
      const def = getDef(name);
      if (def.kind !== 'choice') continue;
      const attrs = new Set((def.props ?? []).map(friendlyName));
      expect(attrs.has('_type'), `${name} uses the discriminator as a property`).toBe(false);
      for (const member of membersOf(name)) {
        for (const p of getDef(member).props ?? []) {
          const f = friendlyName(p);
          expect(attrs.has(f), `${name} + ${member} collide on ${f}`).toBe(false);
        }
      }
    }
  });

  it('gives every enumeration at least one value', () => {
    for (const name of names) {
      const def = getDef(name);
      if (def.kind === 'enum') expect(def.values?.length).toBeGreaterThan(0);
    }
  });

  it('throws a helpful error for unknown types', () => {
    expect(() => getDef('NotADatexType')).toThrow(UnknownTypeError);
    expect(Object.keys(defs).length).toBe(names.length);
  });
});
