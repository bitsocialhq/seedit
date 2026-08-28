// @vitest-environment jsdom

import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useSuggestionFeedLoader from './use-suggestion-feed-loader';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (callback: () => void | Promise<void>) => void | Promise<void> }).act as (callback: () => void | Promise<void>) => void | Promise<void>;

interface HookHarnessProps {
  feedLength?: number;
  hasMore?: boolean;
  loadMore: () => Promise<void>;
  shouldLoad?: boolean;
  targetFeedLength?: number;
}

const HookHarness = ({ feedLength = 0, hasMore = true, loadMore, shouldLoad = true, targetFeedLength = 1 }: HookHarnessProps) => {
  useSuggestionFeedLoader({ feedLength, hasMore, loadMore, requestKey: 'test-feed', shouldLoad, targetFeedLength });
  return null;
};

let container: HTMLDivElement;
let root: Root;

const flushPromises = () => act(async () => Promise.resolve());

describe('useSuggestionFeedLoader', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  it('retries with backoff when loading makes no progress', async () => {
    const loadMore = vi.fn(async () => {});

    await act(() => root.render(createElement(HookHarness, { loadMore })));
    await flushPromises();
    expect(loadMore).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(loadMore).toHaveBeenCalledTimes(2);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_999);
    });
    expect(loadMore).toHaveBeenCalledTimes(2);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(loadMore).toHaveBeenCalledTimes(3);
  });

  it('does not duplicate the initial request during strict mode effect replay', async () => {
    const loadMore = vi.fn(async () => {});

    await act(() => root.render(createElement(React.StrictMode, null, createElement(HookHarness, { loadMore }))));
    await flushPromises();

    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it('handles a rejected load and retries it', async () => {
    const loadMore = vi.fn().mockRejectedValueOnce(new Error('load failed')).mockResolvedValue(undefined);

    await act(() => root.render(createElement(HookHarness, { loadMore })));
    await flushPromises();
    expect(loadMore).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(loadMore).toHaveBeenCalledTimes(2);
  });

  it('cancels a pending retry when the target is reached', async () => {
    const loadMore = vi.fn(async () => {});

    await act(() => root.render(createElement(HookHarness, { loadMore })));
    await flushPromises();
    await act(() => root.render(createElement(HookHarness, { feedLength: 1, loadMore })));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(loadMore).toHaveBeenCalledTimes(1);
  });
});
