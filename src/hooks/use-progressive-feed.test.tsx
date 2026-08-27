// @vitest-environment jsdom

import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Comment, UseFeedOptions, UseFeedResult } from '@bitsocial/bitsocial-react-hooks';
import useProgressiveFeed from './use-progressive-feed';
import useProgressiveFeedStore from '../stores/use-progressive-feed-store';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (callback: () => void | Promise<void>) => void | Promise<void> }).act as (callback: () => void | Promise<void>) => void | Promise<void>;

const day = 60 * 60 * 24;
const testState = vi.hoisted(() => ({
  baseFeedLength: 0,
  baseHasMore: false,
  probeLengths: new Map<number | undefined, number>(),
  expandTimeWindow: vi.fn(async (_newerThan?: number) => {}),
  loadMore: vi.fn(async () => {}),
}));

const posts = (count: number): Comment[] => Array.from({ length: count }, (_, index) => ({ cid: `post-${index}` }) as Comment);

vi.mock('./use-feed-with-compatible-sort', () => ({
  default: (options: UseFeedOptions): UseFeedResult => {
    const isDisabled = options.communities?.length === 0;
    const isBaseFeed = options.newerThan === day;
    const feedLength = isDisabled ? 0 : isBaseFeed ? testState.baseFeedLength : (testState.probeLengths.get(options.newerThan) ?? 0);
    return {
      feed: posts(feedLength),
      hasMore: isBaseFeed ? testState.baseHasMore : false,
      loadMore: testState.loadMore,
      expandTimeWindow: testState.expandTimeWindow,
      reset: vi.fn(async () => {}),
      communityKeysWithNewerPosts: [],
      state: 'succeeded',
      error: undefined,
      errors: [],
    };
  },
}));

let container: HTMLDivElement;
let root: Root;
let hookResult: UseFeedResult;

const HookHarness = () => {
  hookResult = useProgressiveFeed({
    enabled: true,
    feedOptions: {
      communities: [{ name: 'progressive-test.bso' }],
      newerThan: day,
      postsPerPage: 25,
      sortType: 'new',
    },
  });
  return null;
};

describe('useProgressiveFeed', () => {
  beforeEach(() => {
    testState.baseFeedLength = 0;
    testState.baseHasMore = false;
    testState.probeLengths = new Map();
    testState.expandTimeWindow.mockClear();
    testState.loadMore.mockClear();
    useProgressiveFeedStore.setState({ windows: {} });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('waits for probes and expands a sparse initial feed in place to the narrowest full window', async () => {
    testState.baseFeedLength = 4;
    testState.probeLengths = new Map([
      [7 * day, 25],
      [30 * day, 40],
      [365 * day, 60],
      [undefined, 80],
    ]);

    await act(() => root.render(createElement(HookHarness)));

    expect(testState.expandTimeWindow).toHaveBeenCalledTimes(1);
    expect(testState.expandTimeWindow).toHaveBeenCalledWith(7 * day);
    expect(hookResult.feed).toHaveLength(4);
  });

  it('uses a broader ready probe when manual loading exhausts the current window', async () => {
    testState.baseFeedLength = 25;
    testState.probeLengths = new Map([
      [7 * day, 25],
      [30 * day, 31],
      [365 * day, 50],
      [undefined, 70],
    ]);

    await act(() => root.render(createElement(HookHarness)));
    await act(() => hookResult.loadMore());

    expect(testState.expandTimeWindow).toHaveBeenCalledTimes(1);
    expect(testState.expandTimeWindow).toHaveBeenCalledWith(30 * day);
  });
});
