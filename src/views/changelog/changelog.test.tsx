// @vitest-environment jsdom

import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import packageJson from '../../../package.json';
import changelogMarkdown from '../../../CHANGELOG.md?raw';
import { parseChangelog } from '../../lib/utils/changelog-utils';
import { ChangelogLog } from './changelog';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (callback: () => void | Promise<void>) => void | Promise<void> }).act as (callback: () => void | Promise<void>) => void | Promise<void>;

let root: Root;
let container: HTMLDivElement;

const renderChangelog = () =>
  act(() => {
    root.render(createElement(HashRouter, null, createElement(ChangelogLog)));
  });

const getReleaseHeadings = () => Array.from(container.querySelectorAll('section h2'));

describe('ChangelogLog', () => {
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('tells the reader which version they are running', () => {
    renderChangelog();

    expect(container.textContent).toContain(`v${packageJson.version}`);
  });

  it('tags the running version once, when the changelog already lists that release', () => {
    const isReleased = parseChangelog(changelogMarkdown).some((release) => release.version === packageJson.version);
    renderChangelog();

    const taggedHeadings = getReleaseHeadings().filter((heading) => heading.textContent?.includes('running'));

    expect(taggedHeadings).toHaveLength(isReleased ? 1 : 0);
    if (isReleased) {
      expect(taggedHeadings[0].textContent).toContain(`v${packageJson.version}`);
    }
  });

  it('renders a release section for every version in the changelog', () => {
    renderChangelog();

    const headings = getReleaseHeadings();

    expect(headings).toHaveLength(parseChangelog(changelogMarkdown).length);
    for (const heading of headings) {
      expect(heading.textContent).toMatch(/^v\d+\.\d+\.\d+/);
    }
  });

  it('lists releases newest first, matching the changelog order', () => {
    renderChangelog();

    // the first span of a release heading is the version, the rest is date and metadata
    const renderedVersions = getReleaseHeadings().map((heading) => heading.querySelector('span')!.textContent!.replace(/^v/, ''));

    expect(renderedVersions).toEqual(parseChangelog(changelogMarkdown).map((release) => release.version));
  });

  it('gives every version in the jump index a matching release anchor', () => {
    renderChangelog();

    const indexTargets = Array.from(container.querySelectorAll<HTMLAnchorElement>('nav a')).map((link) => link.getAttribute('href')!.split('#').pop());

    expect(indexTargets.length).toBeGreaterThan(0);
    for (const target of indexTargets) {
      expect(container.querySelector(`#${target}`)).not.toBeNull();
    }
  });

  it('opens commit links in a new tab safely', () => {
    renderChangelog();

    const commitLinks = Array.from(container.querySelectorAll<HTMLAnchorElement>('li a')).filter((link) => link.getAttribute('href')?.includes('/commit/'));

    expect(commitLinks.length).toBeGreaterThan(0);
    for (const link of commitLinks) {
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    }
  });
});
