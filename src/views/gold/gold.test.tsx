// @vitest-environment jsdom

import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GoldFaq } from './gold';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (callback: () => void | Promise<void>) => void | Promise<void> }).act as (callback: () => void | Promise<void>) => void | Promise<void>;

let root: Root;
let container: HTMLDivElement;

const renderGoldFaq = () =>
  act(() => {
    root.render(createElement(HashRouter, null, createElement(GoldFaq)));
  });

describe('GoldFaq', () => {
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('states that seedit gold is planned and not purchasable yet', () => {
    renderGoldFaq();

    expect(container.textContent).toContain('not available yet');
    expect(container.textContent).toContain('no purchase, activation, or renewal flow yet');
  });

  it('documents the two benefits and the crypto-only yearly pricing', () => {
    renderGoldFaq();

    expect(container.textContent).toContain('publishing without solving a challenge');
    expect(container.textContent).toContain('$30 for 1 year, or $60 for 3 years');
    expect(container.textContent).toContain('crypto-only checkout');
  });

  it('links directory vote eligibility to the default community list route', () => {
    renderGoldFaq();

    const directoryLinks = Array.from(container.querySelectorAll<HTMLAnchorElement>('a')).filter((link) => link.getAttribute('href') === '#/communities/vote');

    expect(directoryLinks.length).toBeGreaterThan(0);
  });

  it('gives every question in the table of contents a matching section anchor', () => {
    renderGoldFaq();

    const tocTargets = Array.from(container.querySelectorAll<HTMLAnchorElement>('a[href*="#/gold#"]')).map((link) => link.getAttribute('href')!.split('#').pop());

    expect(tocTargets.length).toBeGreaterThan(0);
    for (const target of tocTargets) {
      expect(container.querySelector(`#${target}`)).not.toBeNull();
    }
  });
});
