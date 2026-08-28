import { describe, expect, it } from 'vitest';
import { getCanonicalTopPath, getFeedSortType, getRouteSortType, isValidRouteSortType } from './sort-types';

describe('feed sort route mapping', () => {
  it('keeps top in routes while mapping it to the protocol topAll sort', () => {
    expect(getRouteSortType('top')).toBe('top');
    expect(getFeedSortType('top')).toBe('topAll');
  });

  it('accepts topAll only as a legacy route alias', () => {
    expect(isValidRouteSortType('topAll')).toBe(true);
    expect(getRouteSortType('topAll')).toBe('top');
  });

  it('canonicalizes only the final topAll route segment', () => {
    expect(getCanonicalTopPath('/s/topAll/topAll/1y', '?q=test')).toBe('/s/topAll/top/1y?q=test');
  });
});
