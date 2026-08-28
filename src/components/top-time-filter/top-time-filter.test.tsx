// @vitest-environment jsdom

import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TopTimeFilter from './top-time-filter';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (callback: () => void | Promise<void>) => void | Promise<void> }).act as (callback: () => void | Promise<void>) => void | Promise<void>;

const labels: Record<string, string> = {
  links_from: 'links from',
  past_hour: 'past hour',
  past_24_hours: 'past 24 hours',
  past_week: 'past week',
  past_month: 'past month',
  past_year: 'past year',
  all_time: 'all time',
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => labels[key] || key }),
}));

vi.mock('../../hooks/use-time-filter', () => ({
  topTimeFilterNames: ['1h', '24h', '1w', '1m', '1y', 'all'],
  setSessionTimeFilterPreference: (sessionKey: string | null, timeFilterName: string) => {
    if (sessionKey) sessionStorage.setItem(sessionKey, timeFilterName);
  },
}));

let container: HTMLDivElement;
let root: Root;

describe('TopTimeFilter', () => {
  beforeEach(() => {
    sessionStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('matches the old Reddit wording and omits the selected option from the dropdown', async () => {
    await act(() =>
      root.render(
        createElement(
          MemoryRouter,
          { initialEntries: ['/s/example.bso/top/all?q=test'] },
          createElement(
            Routes,
            null,
            createElement(Route, {
              path: '/s/:communityAddress/:sortType/:timeFilterName',
              element: createElement(TopTimeFilter, { selectedTimeFilterName: 'all', sessionKey: 'test-top-filter' }),
            }),
          ),
        ),
      ),
    );

    expect(container.textContent).toContain('links from:');
    expect(container.querySelector('summary')?.textContent).toBe('all time');
    expect(Array.from(container.querySelectorAll('a')).map((link) => link.textContent)).toEqual(['past hour', 'past 24 hours', 'past week', 'past month', 'past year']);

    const pastWeekLink = Array.from(container.querySelectorAll('a')).find((link) => link.textContent === 'past week');
    expect(pastWeekLink?.getAttribute('href')).toBe('/s/example.bso/top/1w?q=test');
    await act(() => pastWeekLink?.click());
    expect(sessionStorage.getItem('test-top-filter')).toBe('1w');
  });
});
