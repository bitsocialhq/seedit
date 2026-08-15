// @vitest-environment jsdom

import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useDevelopmentDebugStore from '../../stores/use-development-debug-store';
import DevelopmentFeedResetButton from './development-feed-reset-button';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (callback: () => void | Promise<void>) => void | Promise<void> }).act as (callback: () => void | Promise<void>) => void | Promise<void>;

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('DevelopmentFeedResetButton', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    useDevelopmentDebugStore.setState({ showFeedResetButton: false });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('only renders when the preference is enabled and resets the current feed', async () => {
    const onReset = vi.fn();

    await act(() => root.render(createElement(DevelopmentFeedResetButton, { onReset })));
    expect(container.querySelector('button')).toBeNull();

    await act(() => useDevelopmentDebugStore.getState().setShowFeedResetButton(true));
    const button = container.querySelector('button');
    expect(button?.textContent).toBe('reset_feed');

    await act(() => button?.click());
    expect(onReset).toHaveBeenCalledOnce();
  });
});
