import { describe, expect, it } from 'vitest';
import { getTimeFilterPath, getWiderTimeFilterWithPosts } from './time-filter-utils';

const day = 60 * 60 * 24;

describe('getWiderTimeFilterWithPosts', () => {
  it('picks the narrowest wider time filter that has posts', () => {
    expect(getWiderTimeFilterWithPosts({ timeFilterSeconds: day, weeklyFeedLength: 3, monthlyFeedLength: 8, yearlyFeedLength: 20 })).toBe('1w');
    expect(getWiderTimeFilterWithPosts({ timeFilterSeconds: day, weeklyFeedLength: 0, monthlyFeedLength: 8, yearlyFeedLength: 20 })).toBe('1m');
    expect(getWiderTimeFilterWithPosts({ timeFilterSeconds: day, weeklyFeedLength: 0, monthlyFeedLength: 0, yearlyFeedLength: 20 })).toBe('1y');
  });

  it('never picks a time filter that is not wider than the current one', () => {
    expect(getWiderTimeFilterWithPosts({ timeFilterSeconds: 7 * day, weeklyFeedLength: 5, monthlyFeedLength: 0, yearlyFeedLength: 0 })).toBe(undefined);
    expect(getWiderTimeFilterWithPosts({ timeFilterSeconds: 30 * day, weeklyFeedLength: 5, monthlyFeedLength: 5, yearlyFeedLength: 9 })).toBe('1y');
    expect(getWiderTimeFilterWithPosts({ timeFilterSeconds: 365 * day, weeklyFeedLength: 5, monthlyFeedLength: 5, yearlyFeedLength: 5 })).toBe(undefined);
  });

  it('stays put when no wider feed has posts, and when the filter is already all', () => {
    expect(getWiderTimeFilterWithPosts({ timeFilterSeconds: day, weeklyFeedLength: 0, monthlyFeedLength: 0, yearlyFeedLength: 0 })).toBe(undefined);
    expect(getWiderTimeFilterWithPosts({ timeFilterSeconds: undefined, weeklyFeedLength: 5, monthlyFeedLength: 5, yearlyFeedLength: 5 })).toBe(undefined);
  });

  it('handles the dynamic last visit time filters', () => {
    expect(getWiderTimeFilterWithPosts({ timeFilterSeconds: 3 * day, weeklyFeedLength: 2, monthlyFeedLength: 4, yearlyFeedLength: 4 })).toBe('1w');
    expect(getWiderTimeFilterWithPosts({ timeFilterSeconds: 3 * 7 * day, weeklyFeedLength: 2, monthlyFeedLength: 4, yearlyFeedLength: 4 })).toBe('1m');
  });
});

describe('getTimeFilterPath', () => {
  it('keeps the user in the same feed view', () => {
    expect(getTimeFilterPath({ pathname: '/hot/24h', sortType: 'hot', timeFilterName: '1w' })).toBe('/hot/1w');
    expect(getTimeFilterPath({ pathname: '/s/all/new/24h', sortType: 'new', timeFilterName: '1w' })).toBe('/s/all/new/1w');
    expect(getTimeFilterPath({ pathname: '/s/mod/hot/24h', sortType: 'hot', timeFilterName: '1m' })).toBe('/s/mod/hot/1m');
    expect(getTimeFilterPath({ pathname: '/domain/youtube.com/hot/1y', sortType: 'hot', timeFilterName: '1y', domain: 'youtube.com' })).toBe(
      '/domain/youtube.com/hot/1y',
    );
  });

  it('keeps the search params', () => {
    expect(getTimeFilterPath({ pathname: '/hot/24h', sortType: 'hot', timeFilterName: '1w', search: '?q=test' })).toBe('/hot/1w?q=test');
  });
});
