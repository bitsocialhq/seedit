// @vitest-environment jsdom

import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SubscribeButton from './subscribe-button';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (callback: () => void | Promise<void>) => void | Promise<void> }).act as (callback: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  account: undefined as { id: string; subscriptions: string[] } | undefined,
  subscribed: undefined as boolean | undefined,
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock('@bitsocial/bitsocial-react-hooks', () => ({
  useAccount: () => testState.account,
  useSubscribe: () => ({
    state: testState.subscribed === undefined ? 'initializing' : 'ready',
    subscribed: testState.subscribed,
    subscribe: testState.subscribe,
    unsubscribe: testState.unsubscribe,
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/communities/directories' }),
  useParams: () => ({}),
}));

vi.mock('../../lib/utils/starter-account-persistence', () => ({
  persistStarterAccountUpdate: vi.fn(),
}));

vi.mock('../../lib/utils/starter-subscriptions', () => ({
  leaveStarterSubscription: vi.fn(),
}));

vi.mock('../../lib/utils/directory-subscriptions', () => ({
  leaveDirectorySubscription: vi.fn(),
}));

vi.mock('../../lib/utils/directory-account-transforms', () => ({
  joinDirectoryWinnerAccount: vi.fn(),
}));

let container: HTMLDivElement;
let root: Root;

const renderButton = () =>
  act(() => {
    root.render(createElement(SubscribeButton, { address: 'askseedit.bso' }));
  });

describe('SubscribeButton', () => {
  beforeEach(() => {
    testState.account = undefined;
    testState.subscribed = undefined;
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('does not show a false join state while the subscription is loading', async () => {
    await renderButton();
    expect(container.textContent).toBe('');

    testState.account = { id: 'account-1', subscriptions: ['askseedit.bso'] };
    testState.subscribed = true;
    await renderButton();

    expect(container.textContent).toBe('leave');
    expect(container.textContent).not.toContain('join');
  });

  it('shows join after the subscription state explicitly resolves false', async () => {
    testState.account = { id: 'account-1', subscriptions: [] };
    testState.subscribed = false;
    await renderButton();

    expect(container.textContent).toBe('join');
  });
});
