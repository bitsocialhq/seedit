import { afterEach, describe, expect, it, vi } from 'vitest';
import { getArchiveSearchSnapshot, loadMoreArchiveSearch, retryArchiveSearch, subscribeToArchiveSearch } from './use-archive-search';
import type { IndexedPost } from '../lib/search-indexer';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const indexedPost = (cid: string, overrides: Partial<IndexedPost> = {}): IndexedPost => ({
  archived: 0,
  author_address: 'esteban.bso',
  author_name: null,
  cid,
  community_address: 'memes-posting.bso',
  content: 'content',
  deleted: 0,
  depth: 0,
  downvote_count: 0,
  indexed_at: 1787000000,
  link: null,
  parent_cid: null,
  post_cid: cid,
  raw: null,
  removed: 0,
  reply_count: 0,
  thumbnail_url: null,
  timestamp: 1786000000,
  title: `title of ${cid}`,
  upvote_count: 1,
  ...overrides,
});

const okJson = (payload: unknown) => ({ ok: true, status: 200, json: () => Promise.resolve(payload) });
const searchResponse = (page: number, posts: IndexedPost[], total: number) => okJson({ query: 'q', page, limit: 25, total, posts });

const flushInFlight = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('archive search store', () => {
  it('fetches the first page on subscribe and exposes mapped results', async () => {
    const fetchMock = vi.fn().mockResolvedValue(searchResponse(1, [indexedPost('QmA'), indexedPost('QmB')], 2));
    vi.stubGlobal('fetch', fetchMock);

    const unsubscribe = subscribeToArchiveSearch('first page query', () => undefined);
    expect(getArchiveSearchSnapshot('first page query').loading).toBe(true);

    await flushInFlight();
    const snapshot = getArchiveSearchSnapshot('first page query');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(snapshot.loading).toBe(false);
    expect(snapshot.total).toBe(2);
    expect(snapshot.hasMore).toBe(false);
    expect(snapshot.provider?.id).toBe('seeditarchive');
    expect(snapshot.comments.map((comment) => comment.cid)).toEqual(['QmA', 'QmB']);
    unsubscribe();
  });

  it('appends further pages and drops results repeated across pages', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(searchResponse(1, [indexedPost('QmA')], 3))
      // the index shrank between pages, which is also what makes a result repeat
      .mockResolvedValueOnce(searchResponse(2, [indexedPost('QmA'), indexedPost('QmC')], 2));
    vi.stubGlobal('fetch', fetchMock);

    const unsubscribe = subscribeToArchiveSearch('paged query', () => undefined);
    await flushInFlight();
    expect(getArchiveSearchSnapshot('paged query').hasMore).toBe(true);

    loadMoreArchiveSearch('paged query');
    await flushInFlight();

    const snapshot = getArchiveSearchSnapshot('paged query');
    expect(snapshot.comments.map((comment) => comment.cid)).toEqual(['QmA', 'QmC']);
    expect(snapshot.hasMore).toBe(false);
    unsubscribe();
  });

  it('stops asking for more when a page comes back empty despite the total', async () => {
    const fetchMock = vi.fn().mockResolvedValue(searchResponse(1, [], 50));
    vi.stubGlobal('fetch', fetchMock);

    const unsubscribe = subscribeToArchiveSearch('overshooting total', () => undefined);
    await flushInFlight();

    expect(getArchiveSearchSnapshot('overshooting total').hasMore).toBe(false);
    unsubscribe();
  });

  it('surfaces a provider failure and retries on demand', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce(searchResponse(1, [indexedPost('QmA')], 1));
    vi.stubGlobal('fetch', fetchMock);

    const unsubscribe = subscribeToArchiveSearch('failing query', () => undefined);
    await flushInFlight();
    expect(getArchiveSearchSnapshot('failing query').error?.message).toMatch(/503/);

    retryArchiveSearch('failing query');
    await flushInFlight();

    const snapshot = getArchiveSearchSnapshot('failing query');
    expect(snapshot.error).toBeNull();
    expect(snapshot.comments).toHaveLength(1);
    unsubscribe();
  });

  it('retries a stale failure when a new subscriber arrives', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce(searchResponse(1, [indexedPost('QmA')], 1));
    vi.stubGlobal('fetch', fetchMock);

    const unsubscribe = subscribeToArchiveSearch('stale failure query', () => undefined);
    await vi.advanceTimersByTimeAsync(0);
    expect(getArchiveSearchSnapshot('stale failure query').error).not.toBeNull();
    unsubscribe();

    // within the reuse window the failure is replayed, not retried
    const unsubscribeAgain = subscribeToArchiveSearch('stale failure query', () => undefined);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    unsubscribeAgain();

    await vi.advanceTimersByTimeAsync(11_000);
    const unsubscribeLater = subscribeToArchiveSearch('stale failure query', () => undefined);
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(getArchiveSearchSnapshot('stale failure query').comments).toHaveLength(1);
    unsubscribeLater();
  });
});
