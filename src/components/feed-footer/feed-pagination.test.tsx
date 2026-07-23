// @vitest-environment jsdom

import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FeedPagination from './feed-pagination';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (callback: () => void | Promise<void>) => void | Promise<void> }).act as (callback: () => void | Promise<void>) => void | Promise<void>;

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const paginationState = vi.hoisted(() => ({ infiniteFeedEnabled: false }));

vi.mock('../../hooks/use-feed-pagination', () => ({
  useInfiniteFeedEnabled: () => paginationState.infiniteFeedEnabled,
}));

describe('FeedPagination', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    paginationState.infiniteFeedEnabled = false;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('shows a manual load-more button by default and invokes it', async () => {
    const onLoadMore = vi.fn();

    await act(async () => {
      root.render(createElement(FeedPagination, { feedLength: 25, hasMore: true, onLoadMore }));
    });

    const button = container.querySelector('button');
    expect(button?.textContent).toBe('load_more');

    await act(async () => button?.click());
    expect(onLoadMore).toHaveBeenCalledOnce();
  });

  it('hides manual pagination when infinite feed is enabled', async () => {
    paginationState.infiniteFeedEnabled = true;

    await act(async () => {
      root.render(createElement(FeedPagination, { feedLength: 25, hasMore: true, onLoadMore: vi.fn() }));
    });

    expect(container.querySelector('button')).toBeNull();
  });
});
