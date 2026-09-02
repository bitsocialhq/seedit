// @vitest-environment jsdom

import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StickyHeader from './sticky-header';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (callback: () => void | Promise<void>) => void | Promise<void> }).act as (callback: () => void | Promise<void>) => void | Promise<void>;

const topbarState = vi.hoisted(() => ({ autoHideEnabled: false }));

vi.mock('../../hooks/use-topbar-auto-hide', () => ({
  useTopbarAutoHideEnabled: () => topbarState.autoHideEnabled,
}));

vi.mock('../topbar', () => ({ default: () => createElement('div', null, 'topbar') }));
vi.mock('../account-bar', () => ({ default: () => createElement('div', null, 'account bar') }));

describe('StickyHeader', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    topbarState.autoHideEnabled = false;
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  const scrollDown = async () => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 100 });
    await act(async () => {
      window.dispatchEvent(new Event('scroll'));
      vi.advanceTimersByTime(50);
    });
  };

  it('keeps the topbar visible when auto-hide is disabled', async () => {
    await act(async () => root.render(createElement(StickyHeader)));

    await scrollDown();

    expect((container.firstElementChild as HTMLElement).style.transform).toBe('translateY(0)');
  });

  it('animates the topbar with scrolling when auto-hide is enabled', async () => {
    topbarState.autoHideEnabled = true;
    await act(async () => root.render(createElement(StickyHeader)));

    await scrollDown();

    expect((container.firstElementChild as HTMLElement).style.transform).toBe('translateY(-40px)');
  });
});
