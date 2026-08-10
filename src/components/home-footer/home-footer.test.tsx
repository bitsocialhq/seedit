// @vitest-environment jsdom

import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import HomeFooter from './home-footer';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (callback: () => void | Promise<void>) => void | Promise<void> }).act as (callback: () => void | Promise<void>) => void | Promise<void>;

let root: Root;
let container: HTMLDivElement;

describe('HomeFooter', () => {
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('renders the Seedit footer destinations without unavailable links', () => {
    act(() => {
      root.render(createElement(HomeFooter));
    });

    const links = Array.from(container.querySelectorAll<HTMLAnchorElement>('a'));
    const linkDestinations = Object.fromEntries(links.map((link) => [link.textContent || link.getAttribute('aria-label'), link.href]));

    expect(linkDestinations).toMatchObject({
      blog: 'https://bitsocial.net/blog?q=seedit',
      about: 'https://bitsocial.net/apps/seedit',
      docs: 'https://bitsocial.net/docs',
      feedback: 'https://github.com/bitsocialnet/seedit/issues/new',
      contributors: 'https://github.com/bitsocialnet/seedit/graphs/contributors',
      seedit: 'https://bitsocial.net/apps/seedit',
      Bitsocial: 'https://bitsocial.net/',
    });
    expect(container.textContent).not.toContain('advertising');
    expect(container.textContent).not.toContain('careers');
    expect(container.textContent).not.toContain('contact us');
    expect(container.textContent).not.toContain('seedit gold');
  });

  it('uses the 5chan-style FOSS attribution and Bitsocial logo treatment', () => {
    act(() => {
      root.render(createElement(HomeFooter));
    });

    expect(container.textContent).toContain('Seedit is FOSS under GPL-3.0-or-later. Powered by Bitsocial');

    const bitsocialLink = container.querySelector<HTMLAnchorElement>('a[aria-label="Bitsocial"]');
    const logo = bitsocialLink?.querySelector('img');

    expect(bitsocialLink?.textContent).toBe('');
    expect(logo?.getAttribute('src')).toBe('assets/logo/bitsocial.svg');
    expect(logo?.getAttribute('width')).toBe('18');
    expect(logo?.getAttribute('height')).toBe('18');
  });

  it('opens every external destination safely', () => {
    act(() => {
      root.render(createElement(HomeFooter));
    });

    for (const link of container.querySelectorAll('a')) {
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    }
  });
});
