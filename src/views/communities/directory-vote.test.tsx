// @vitest-environment jsdom

import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DirectoryIndex, DirectoryVoteNotice } from './directory-vote';

vi.mock('@bitsocial/bitsocial-react-hooks', () => ({
  useCommunities: () => ({ communities: {} }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string | number>) => {
      const translations: Record<string, string> = {
        directory_route_currently_recommends: `s/${values?.directoryCode} currently recommends`,
        directory_candidates_count: `candidates: ${values?.count}`,
        directory_list_revision: `directory revision ${values?.revision}`,
        directory_winner_explanation: 'Highest rated candidate, so it currently resolves this route.',
        directory_vote_explanation: "Seedit's short s/ routes are directories: communities compete for each route, and the highest rated candidate resolves it.",
        directory_vote_not_open: 'Voting is not open yet.',
        directory_vote_eligibility_link: 'see how eligibility will work',
        winner: 'winner',
      };
      return translations[key] ?? key;
    },
  }),
}));

vi.mock('../../hooks/use-directory-list', () => ({
  useDirectoryList: (directoryCode: string) => ({
    list: {
      schemaVersion: 1,
      revision: 3,
      directoryCode,
      communities: [{ address: `${directoryCode}.bso` }],
    },
    loading: false,
    error: null,
  }),
}));

vi.mock('./community-item', () => ({
  default: () => null,
  NoCommunitiesMessage: () => null,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (callback: () => void | Promise<void>) => void | Promise<void> }).act as (callback: () => void | Promise<void>) => void | Promise<void>;

let root: Root;
let container: HTMLDivElement;

const render = (element: React.ReactNode) =>
  act(() => {
    root.render(createElement(HashRouter, null, element));
  });

describe('directory vote views', () => {
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('presents the directory index as a descriptive list with explicit winners', () => {
    render(createElement(DirectoryIndex));

    const directoryList = container.querySelector('ul[role="list"]');
    const rows = directoryList?.querySelectorAll('li');

    expect(rows).toHaveLength(10);
    expect(rows?.[0].textContent).toContain('s/askseedit: AskSeedit');
    expect(rows?.[0].textContent).toContain('Ask the Seedit community anything');
    expect(rows?.[0].textContent).toContain('winner');
    expect(rows?.[0].textContent).toContain('askseedit.bso');
    expect(rows?.[0].textContent).toContain('directory revision 3');
    expect(rows?.[0].querySelector('[title="Highest rated candidate, so it currently resolves this route."]')).not.toBeNull();
  });

  it('links the eligibility action to the gold explanation', () => {
    render(createElement(DirectoryVoteNotice));

    const eligibilityLink = container.querySelector<HTMLAnchorElement>('a[href="#/gold"]');

    expect(eligibilityLink?.textContent).toBe('see how eligibility will work');
  });
});
