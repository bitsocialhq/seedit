import { describe, expect, it } from 'vitest';
import { getHighlightSegments, getHighlightTerms, matchesQuery } from './search-highlight-utils';

describe('getHighlightTerms', () => {
  it('splits on whitespace, lowercases, and drops duplicates', () => {
    expect(getHighlightTerms('  Cats   and CATS ')).toEqual(['cats', 'and']);
  });

  it('orders longest first so an overlapping term cannot shadow a longer one', () => {
    expect(getHighlightTerms('cat catholic')).toEqual(['catholic', 'cat']);
  });

  it('has no terms for an empty query', () => {
    expect(getHighlightTerms('   ')).toEqual([]);
  });
});

describe('getHighlightSegments', () => {
  it('marks each match and keeps the surrounding text', () => {
    expect(getHighlightSegments('all about cats', ['cats'])).toEqual([
      { match: false, text: 'all about ' },
      { match: true, text: 'cats' },
    ]);
  });

  it('matches case-insensitively and preserves the original casing', () => {
    expect(getHighlightSegments('Cats', ['cats'])).toEqual([{ match: true, text: 'Cats' }]);
  });

  it('treats regex metacharacters in a term as literal text', () => {
    expect(getHighlightSegments('a c++ post', ['c++'])).toEqual([
      { match: false, text: 'a ' },
      { match: true, text: 'c++' },
      { match: false, text: ' post' },
    ]);
  });

  it('returns the whole text unmarked when there are no terms', () => {
    expect(getHighlightSegments('plain', [])).toEqual([{ match: false, text: 'plain' }]);
  });

  it('has no segments for empty text', () => {
    expect(getHighlightSegments('', ['cats'])).toEqual([]);
  });
});

describe('matchesQuery', () => {
  it('is true when any term appears', () => {
    expect(matchesQuery('All About Cats', ['dogs', 'cats'])).toBe(true);
  });

  it('is false for missing text', () => {
    expect(matchesQuery(undefined, ['cats'])).toBe(false);
    expect(matchesQuery(null, ['cats'])).toBe(false);
  });
});
