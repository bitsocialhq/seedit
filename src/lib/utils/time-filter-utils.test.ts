import { describe, expect, it } from 'vitest';
import { getPathWithoutTimeFilter, getTopTimeFilterPath } from './time-filter-utils';

describe('getTopTimeFilterPath', () => {
  it('adds or replaces a top time filter while preserving the query', () => {
    expect(getTopTimeFilterPath('/s/example.bso/top', undefined, 'all')).toBe('/s/example.bso/top/all');
    expect(getTopTimeFilterPath('/s/example.bso/top/1w', '1w', '1y', '?q=test')).toBe('/s/example.bso/top/1y?q=test');
  });
});

describe('getPathWithoutTimeFilter', () => {
  it('removes a legacy non-top time segment and preserves the query', () => {
    expect(getPathWithoutTimeFilter('/s/example.bso/hot/1w', '1w', '?q=test')).toBe('/s/example.bso/hot?q=test');
  });
});
