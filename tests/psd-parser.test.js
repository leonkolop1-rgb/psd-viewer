import { describe, it, expect } from 'vitest';
import { assignIds, flattenLayers } from '../src/psd-parser.js';

describe('assignIds', () => {
  it('assigns sequential ids to flat layers', () => {
    const layers = [
      { name: 'A' },
      { name: 'B' },
    ];
    assignIds(layers);
    expect(layers[0].id).toBe(0);
    expect(layers[1].id).toBe(1);
  });

  it('assigns ids to nested layers', () => {
    const layers = [
      { name: 'Group', children: [
        { name: 'Child' }
      ]},
    ];
    assignIds(layers);
    expect(layers[0].id).toBe(0);
    expect(layers[0].children[0].id).toBe(1);
  });

  it('starts counter fresh on each call via counter param', () => {
    const layers1 = [{ name: 'X' }];
    const layers2 = [{ name: 'Y' }];
    assignIds(layers1);
    assignIds(layers2);
    expect(layers1[0].id).toBe(0);
    expect(layers2[0].id).toBe(0);
  });
});

describe('flattenLayers', () => {
  it('returns flat array of all layers including nested', () => {
    const layers = [
      { id: 0, name: 'Group', children: [
        { id: 1, name: 'Child' }
      ]},
      { id: 2, name: 'Flat' },
    ];
    const flat = flattenLayers(layers);
    expect(flat.map(l => l.id)).toEqual([0, 1, 2]);
  });
});
