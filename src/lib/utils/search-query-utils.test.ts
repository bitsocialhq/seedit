import { describe, expect, it } from 'vitest';
import { buildSearchQuery, parseSearchQuery } from './search-query-utils';

describe('parseSearchQuery', () => {
  it('keeps a query with no prefixes as free text', () => {
    expect(parseSearchQuery('ink study')).toEqual({ filters: {}, freeText: 'ink study' });
  });

  it('has no free text and no filters for a blank query', () => {
    expect(parseSearchQuery('   ')).toEqual({ filters: {}, freeText: '' });
    expect(parseSearchQuery('')).toEqual({ filters: {}, freeText: '' });
  });

  it('extracts every supported prefix and leaves the words behind', () => {
    expect(parseSearchQuery('ink community:aww-posting.bso author:lena.bso site:example.com url:ink-study selftext:tokenizer self:yes nsfw:no')).toEqual({
      filters: {
        author: 'lena.bso',
        community: 'aww-posting.bso',
        nsfw: false,
        self: true,
        selftext: 'tokenizer',
        site: 'example.com',
        url: 'ink-study',
      },
      freeText: 'ink',
    });
  });

  it('matches a prefix case-insensitively and keeps the value in its original case', () => {
    expect(parseSearchQuery('Author:Lena.BSO NSFW:Yes')).toEqual({ filters: { author: 'Lena.BSO', nsfw: true }, freeText: '' });
  });

  it('reads a double-quoted or single-quoted value as one phrase', () => {
    expect(parseSearchQuery('selftext:"two words"').filters.selftext).toBe('two words');
    expect(parseSearchQuery("selftext:'two words'").filters.selftext).toBe('two words');
  });

  it('takes only the first word of an unterminated quote and keeps the rest of the query', () => {
    expect(parseSearchQuery('selftext:"oops here author:lena.bso')).toEqual({ filters: { author: 'lena.bso', selftext: 'oops' }, freeText: 'here' });
  });

  it('is not a filter when an unterminated quote leaves no value at all', () => {
    expect(parseSearchQuery('selftext:" ink')).toEqual({ filters: {}, freeText: 'selftext:" ink' });
  });

  it('leaves an unknown prefix, a bare colon and an empty value in the free text', () => {
    expect(parseSearchQuery('flair:x cats')).toEqual({ filters: {}, freeText: 'flair:x cats' });
    expect(parseSearchQuery('cats : dogs')).toEqual({ filters: {}, freeText: 'cats : dogs' });
    expect(parseSearchQuery('author: lena.bso')).toEqual({ filters: {}, freeText: 'author: lena.bso' });
  });

  it('accepts only yes/no for self: and nsfw:', () => {
    expect(parseSearchQuery('self:maybe nsfw:1')).toEqual({ filters: {}, freeText: 'self:maybe nsfw:1' });
    expect(parseSearchQuery('self:NO')).toEqual({ filters: { self: false }, freeText: '' });
  });

  it('lets the last occurrence of a repeated prefix win, removing both', () => {
    expect(parseSearchQuery('author:first ink author:second')).toEqual({ filters: { author: 'second' }, freeText: 'ink' });
  });

  it('collapses the gap left where a filter was removed', () => {
    expect(parseSearchQuery('foo author:x bar').freeText).toBe('foo bar');
    expect(parseSearchQuery('  foo   author:x   bar  ').freeText).toBe('foo bar');
  });

  it('ignores a prefix that is not at the start of a word', () => {
    expect(parseSearchQuery('myauthor:x https://example.com/url:y')).toEqual({ filters: {}, freeText: 'myauthor:x https://example.com/url:y' });
  });

  it('does not read selftext: as self:', () => {
    expect(parseSearchQuery('selftext:yes')).toEqual({ filters: { selftext: 'yes' }, freeText: '' });
  });
});

describe('buildSearchQuery', () => {
  it('writes the free text first, then the filters in a fixed order', () => {
    expect(buildSearchQuery({ filters: { self: true, nsfw: false, community: 'aww-posting.bso', author: 'lena.bso' }, freeText: 'ink study' })).toBe(
      'ink study author:lena.bso community:aww-posting.bso nsfw:no self:yes',
    );
  });

  it('quotes a value containing a space', () => {
    expect(buildSearchQuery({ filters: { selftext: 'two words' }, freeText: '' })).toBe('selftext:"two words"');
  });

  it('wraps a value containing a double quote in single quotes', () => {
    expect(buildSearchQuery({ filters: { selftext: 'say "hi" now' }, freeText: '' })).toBe(`selftext:'say "hi" now'`);
  });

  it('drops an empty value and an absent boolean', () => {
    expect(buildSearchQuery({ filters: { author: '   ', selftext: '' }, freeText: 'ink' })).toBe('ink');
  });

  it('is an empty string for an empty query', () => {
    expect(buildSearchQuery({ filters: {}, freeText: '' })).toBe('');
  });
});

describe('parseSearchQuery and buildSearchQuery round trip', () => {
  it('re-parses a built query to the same result', () => {
    const parsed = parseSearchQuery('ink study community:aww-posting.bso author:Lena.BSO selftext:"two words" site:example.com self:yes nsfw:no');
    expect(buildSearchQuery(parsed)).toBe('ink study author:Lena.BSO community:aww-posting.bso selftext:"two words" site:example.com nsfw:no self:yes');
    expect(parseSearchQuery(buildSearchQuery(parsed))).toEqual(parsed);
  });

  it('round trips values that start with or contain a quote character', () => {
    const parsed = { filters: { selftext: `'hi`, url: 'a "b" c' }, freeText: 'ink' };
    expect(parseSearchQuery(buildSearchQuery(parsed))).toEqual(parsed);
  });
});
