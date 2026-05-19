import { describe, it, expect } from 'vitest';
import { collectVisibleLeaves } from '../src/canvas-renderer.js';

describe('collectVisibleLeaves', () => {
  it('returns only pixel layers in visibleIds', () => {
    const visibleIds = new Set([0, 2]);
    const layers = [
      { id: 0, canvas: {}, children: undefined },
      { id: 1, canvas: {}, children: undefined },
      { id: 2, canvas: {}, children: undefined },
    ];
    const result = collectVisibleLeaves(layers, visibleIds);
    expect(result.map(l => l.id)).toEqual([0, 2]);
  });

  it('excludes children of a hidden group', () => {
    const visibleIds = new Set([1]); // group 0 hidden, child 1 visible
    const layers = [
      { id: 0, children: [
        { id: 1, canvas: {}, children: undefined },
      ]},
    ];
    const result = collectVisibleLeaves(layers, visibleIds);
    expect(result).toHaveLength(0);
  });

  it('includes children of a visible group', () => {
    const visibleIds = new Set([0, 1]);
    const layers = [
      { id: 0, children: [
        { id: 1, canvas: {}, children: undefined },
      ]},
    ];
    const result = collectVisibleLeaves(layers, visibleIds);
    expect(result.map(l => l.id)).toEqual([1]);
  });
});
