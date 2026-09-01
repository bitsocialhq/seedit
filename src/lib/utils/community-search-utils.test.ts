import { describe, expect, it } from 'vitest';
import { mergeCommunitySources, searchCommunities } from './community-search-utils';
import type { IndexedCommunity } from '../search-indexer';

const indexed = (address: string, overrides: Partial<IndexedCommunity> = {}): IndexedCommunity => ({
  address,
  description: null,
  last_indexed_at: 0,
  post_count: 0,
  title: null,
  ...overrides,
});

describe('mergeCommunitySources', () => {
  it("keeps seedit's curated title over the indexer's, and stays nsfw if either says so", () => {
    const merged = mergeCommunitySources({
      starter: [{ address: 'funny-posting.bso', title: 'Funny', nsfw: true }],
      archive: [indexed('funny-posting.bso', { title: 'Crawled Funny', post_count: 12 })],
    });

    expect(merged).toEqual([{ address: 'funny-posting.bso', archivedPostCount: 12, description: undefined, nsfw: true, tags: undefined, title: 'Funny' }]);
  });

  it('fills a missing description from the indexer', () => {
    const [merged] = mergeCommunitySources({
      starter: [{ address: 'news-posting.bso', title: 'News' }],
      archive: [indexed('news-posting.bso', { description: 'crawled description' })],
    });

    expect(merged.description).toBe('crawled description');
  });

  it('dedupes addresses that differ only in case', () => {
    const merged = mergeCommunitySources({
      starter: [{ address: 'Aww-Posting.bso' }],
      archive: [indexed('aww-posting.bso', { post_count: 3 })],
    });

    expect(merged).toHaveLength(1);
    expect(merged[0].address).toBe('Aww-Posting.bso');
    expect(merged[0].archivedPostCount).toBe(3);
  });

  it('carries through a community only the indexer knows', () => {
    const merged = mergeCommunitySources({ archive: [indexed('unknown.bso')] });
    expect(merged.map((community) => community.address)).toEqual(['unknown.bso']);
  });
});

describe('searchCommunities', () => {
  const sources = {
    starter: [
      { address: 'funny-posting.bso', title: 'Funny', description: 'jokes and memes' },
      { address: 'memes-posting.bso', title: 'Memes', description: 'funny pictures' },
      { address: 'nsfw-posting.bso', title: 'After Dark', description: 'funny but adult', nsfw: true },
    ],
    archive: [indexed('memes-posting.bso', { post_count: 40 }), indexed('funny-posting.bso', { post_count: 2 })],
  };

  it('has no matches for an empty query', () => {
    expect(searchCommunities(sources, '   ')).toEqual([]);
  });

  it('pins an exact address match first and flags it', () => {
    const results = searchCommunities(sources, 'memes-posting.bso');
    expect(results[0].address).toBe('memes-posting.bso');
    expect(results[0].exact).toBe(true);
  });

  it('ranks a title match above a description-only match', () => {
    const results = searchCommunities(sources, 'funny');
    expect(results.map((community) => community.address)).toEqual(['funny-posting.bso', 'memes-posting.bso']);
    expect(results[0].exact).toBe(false);
  });

  it('excludes nsfw communities unless they are asked for', () => {
    expect(searchCommunities(sources, 'funny').some((community) => community.nsfw)).toBe(false);
    expect(searchCommunities(sources, 'funny', { includeNsfw: true }).some((community) => community.nsfw)).toBe(true);
  });

  it('matches tags as well as names and descriptions', () => {
    const results = searchCommunities({ starter: [{ address: 'pics-posting.bso', tags: ['photography'] }] }, 'photography');
    expect(results.map((community) => community.address)).toEqual(['pics-posting.bso']);
  });

  it('breaks an equal rank on how much the archive holds', () => {
    const results = searchCommunities(
      {
        starter: [
          { address: 'a-posting.bso', description: 'shared word' },
          { address: 'b-posting.bso', description: 'shared word' },
        ],
        archive: [indexed('b-posting.bso', { post_count: 9 })],
      },
      'shared',
    );
    expect(results.map((community) => community.address)).toEqual(['b-posting.bso', 'a-posting.bso']);
  });
});

describe('nsfw from the indexer', () => {
  it('marks a community nsfw when the indexer resolved it as nsfw', () => {
    const [merged] = mergeCommunitySources({ archive: [indexed('after-dark.bso', { nsfw: 1 })] });
    expect(merged.nsfw).toBe(true);
  });

  it('is not nsfw when the indexer says so, or is too old to say', () => {
    expect(mergeCommunitySources({ archive: [indexed('safe.bso', { nsfw: 0 })] })[0].nsfw).toBe(false);
    expect(mergeCommunitySources({ archive: [indexed('unknown.bso')] })[0].nsfw).toBe(false);
  });

  it('excludes an indexer-flagged community from a safe search', () => {
    const sources = { archive: [indexed('after-dark.bso', { nsfw: 1, title: 'After Dark' })] };
    expect(searchCommunities(sources, 'dark')).toEqual([]);
    expect(searchCommunities(sources, 'dark', { includeNsfw: true })).toHaveLength(1);
  });
});
