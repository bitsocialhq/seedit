// @vitest-environment jsdom

import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useTimeFilter from './use-time-filter';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (callback: () => void | Promise<void>) => void | Promise<void> }).act as (callback: () => void | Promise<void>) => void | Promise<void>;

type TimeFilterResult = ReturnType<typeof useTimeFilter>;

let container: HTMLDivElement;
let root: Root;
let result: TimeFilterResult | undefined;

const Probe = () => {
  result = useTimeFilter();
  return null;
};

const renderRoute = async (routePath: string, initialEntry: string) => {
  await act(() =>
    root.render(
      createElement(
        MemoryRouter,
        { initialEntries: [initialEntry], key: initialEntry },
        createElement(Routes, null, createElement(Route, { path: routePath, element: createElement(Probe) })),
      ),
    ),
  );
};

describe('useTimeFilter', () => {
  beforeEach(() => {
    sessionStorage.clear();
    result = undefined;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it.each([
    ['home', 'sessionTimeFilter-home', '/:sortType/:timeFilterName?', '/top', '/top/1w'],
    ['all', 'sessionTimeFilter-all', '/s/all/:sortType/:timeFilterName?', '/s/all/top', '/s/all/top/1w'],
    ['moderated', 'sessionTimeFilter-mod', '/s/mod/:sortType/:timeFilterName?', '/s/mod/top', '/s/mod/top/1w'],
    ['community', 'sessionTimeFilter-community-example.bso', '/s/:communityAddress/:sortType/:timeFilterName?', '/s/example.bso/top', '/s/example.bso/top/1w'],
    ['domain', 'sessionTimeFilter-domain-example.com', '/domain/:domain/:sortType/:timeFilterName?', '/domain/example.com/top', '/domain/example.com/top/1w'],
  ])('returns an explicit remembered top route for the %s feed', async (_view, sessionKey, routePath, initialEntry, expectedPath) => {
    sessionStorage.setItem(sessionKey, '1w');

    await renderRoute(routePath, initialEntry);

    expect(result?.preferredTopTimeFilterPath).toBe(expectedPath);
    expect(result?.timeFilterName).toBe('1w');
  });

  it('does not replace an explicit top route', async () => {
    sessionStorage.setItem('sessionTimeFilter-home', '1w');

    await renderRoute('/:sortType/:timeFilterName?', '/top/24h');
    expect(result?.preferredTopTimeFilterPath).toBeNull();
    expect(result?.timeFilterName).toBe('24h');
  });

  it('falls back to all time when session storage cannot be read', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage denied');
    });

    await renderRoute('/:sortType/:timeFilterName?', '/top');

    expect(result?.preferredTopTimeFilterPath).toBeNull();
    expect(result?.timeFilterName).toBe('all');
  });
});
