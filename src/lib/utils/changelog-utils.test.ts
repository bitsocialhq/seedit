import { describe, expect, it } from 'vitest';
import changelogMarkdown from '../../../CHANGELOG.md?raw';
import { getReleaseAnchorId, parseChangelog, type ChangelogEntry } from './changelog-utils';

const textOf = (entry: ChangelogEntry) => entry.description.map((segment) => segment.text).join('');
const linksOf = (entry: ChangelogEntry) => entry.description.filter((segment) => segment.url).map((segment) => ({ text: segment.text, url: segment.url }));

describe('parseChangelog', () => {
  it('reads version, date and compare url from a patch release heading', () => {
    const releases = parseChangelog(
      [
        '## [0.5.10](https://github.com/bitsocialnet/seedit/compare/v0.5.9...v0.5.10) (2025-09-26)',
        '',
        '### Bug Fixes',
        '',
        '* fix it ([a33d708](https://github.com/bitsocialnet/seedit/commit/a33d708))',
      ].join('\n'),
    );

    expect(releases).toHaveLength(1);
    expect(releases[0].version).toBe('0.5.10');
    expect(releases[0].date).toBe('2025-09-26');
    expect(releases[0].compareUrl).toBe('https://github.com/bitsocialnet/seedit/compare/v0.5.9...v0.5.10');
  });

  it('reads minor releases written with a single heading level', () => {
    const releases = parseChangelog(
      ['# [0.4.0](https://example.com/compare) (2025-04-16)', '', '### Features', '', '* add it ([abc1234](https://github.com/bitsocialnet/seedit/commit/abc1234))'].join(
        '\n',
      ),
    );

    expect(releases[0].version).toBe('0.4.0');
    expect(releases[0].sections[0].title).toBe('Features');
  });

  it('separates the scope from the description and keeps the commit link', () => {
    const releases = parseChangelog(
      [
        '## [0.5.10](https://example.com/compare) (2025-09-26)',
        '',
        '### Bug Fixes',
        '',
        '* **electron:** keep module-scoped Tray ref ([a33d708](https://github.com/bitsocialnet/seedit/commit/a33d708e069c))',
        '* missing error displays in json editors ([06b9598](https://github.com/bitsocialnet/seedit/commit/06b95985547))',
      ].join('\n'),
    );

    const [scoped, unscoped] = releases[0].sections[0].entries;
    expect(scoped.scope).toBe('electron');
    expect(textOf(scoped)).toBe('keep module-scoped Tray ref');
    expect(scoped.hash).toBe('a33d708');
    expect(scoped.url).toBe('https://github.com/bitsocialnet/seedit/commit/a33d708e069c');
    expect(unscoped.scope).toBeUndefined();
    expect(textOf(unscoped)).toBe('missing error displays in json editors');
  });

  // the angular preset appends `, closes [#N](...)` whenever a commit references an issue
  it('keeps a commit whose bullet ends in issue references, not the commit link', () => {
    const releases = parseChangelog(
      [
        '## [0.5.11](https://example.com/compare) (2026-08-28)',
        '',
        '### Features',
        '',
        '* remove all plebbit references (#832) ([36fd5f3](https://github.com/bitsocialnet/seedit/commit/36fd5f39363d)), closes [#832](https://github.com/bitsocialnet/seedit/issues/832)',
      ].join('\n'),
    );

    const [entry] = releases[0].sections[0].entries;
    expect(entry.hash).toBe('36fd5f3');
    expect(entry.url).toBe('https://github.com/bitsocialnet/seedit/commit/36fd5f39363d');
    expect(textOf(entry)).toBe('remove all plebbit references (#832), closes #832');
    expect(linksOf(entry)).toEqual([{ text: '#832', url: 'https://github.com/bitsocialnet/seedit/issues/832' }]);
  });

  // the preset inlines issue and user autolinks into the subject itself
  it('turns links inside the description into linked segments instead of raw markdown', () => {
    const releases = parseChangelog(
      [
        '## [0.5.11](https://example.com/compare) (2026-08-28)',
        '',
        '### Bug Fixes',
        '',
        '* **vite:** exclude [@peculiar](https://github.com/peculiar) packages ([0770000](https://github.com/bitsocialnet/seedit/commit/07700008f4f5))',
      ].join('\n'),
    );

    const [entry] = releases[0].sections[0].entries;
    expect(textOf(entry)).toBe('exclude @peculiar packages');
    expect(linksOf(entry)).toEqual([{ text: '@peculiar', url: 'https://github.com/peculiar' }]);
    expect(textOf(entry)).not.toContain('](');
  });

  // BREAKING CHANGES notes carry no commit link and wrap onto the following lines
  it('keeps breaking change notes and the lines they wrap onto', () => {
    const releases = parseChangelog(
      [
        '## [0.5.11](https://example.com/compare) (2026-08-28)',
        '',
        '### BREAKING CHANGES',
        '',
        '* accounts created before the pkc rename are no longer',
        'migrated. Existing exported accounts are ignored.',
        '',
        '* a second note',
      ].join('\n'),
    );

    const [notes] = releases[0].sections;
    expect(notes.title).toBe('BREAKING CHANGES');
    expect(notes.entries).toHaveLength(2);
    expect(notes.entries[0].hash).toBeUndefined();
    expect(textOf(notes.entries[0])).toBe('accounts created before the pkc rename are no longer migrated. Existing exported accounts are ignored.');
    expect(textOf(notes.entries[1])).toBe('a second note');
  });

  // paragraphs inside a note are separated by a blank line, and must not run together
  it('keeps paragraph breaks inside a breaking change note', () => {
    const releases = parseChangelog(
      [
        '## [0.5.11](https://example.com/compare) (2026-08-28)',
        '',
        '### BREAKING CHANGES',
        '',
        '* accounts created before the pkc rename are no longer',
        'migrated.',
        '',
        'The release workflow now reads a new secret.',
      ].join('\n'),
    );

    const [note] = releases[0].sections[0].entries;
    expect(releases[0].sections[0].entries).toHaveLength(1);
    expect(textOf(note)).toBe('accounts created before the pkc rename are no longer migrated.\n\nThe release workflow now reads a new secret.');
  });

  // the preset writes note sub-lists with `-` at column 0, which must not become sibling entries
  it('keeps a sub-list inside the note it belongs to', () => {
    const releases = parseChangelog(
      [
        '## [0.5.11](https://example.com/compare) (2026-08-28)',
        '',
        '### BREAKING CHANGES',
        '',
        '* docs(rebrand): retire plebbit naming',
        '',
        '- rewrite github.com links',
        '- regenerate public/llms.txt',
      ].join('\n'),
    );

    const entries = releases[0].sections[0].entries;
    expect(entries).toHaveLength(1);
    expect(textOf(entries[0])).toBe('docs(rebrand): retire plebbit naming\n- rewrite github.com links\n- regenerate public/llms.txt');
  });

  it('groups entries under the section heading that precedes them', () => {
    const releases = parseChangelog(
      [
        '## [0.5.10](https://example.com/compare) (2025-09-26)',
        '',
        '### Bug Fixes',
        '',
        '* fix one ([aaaaaaa](https://github.com/bitsocialnet/seedit/commit/aaaaaaa))',
        '',
        '### Performance Improvements',
        '',
        '* speed it up ([bbbbbbb](https://github.com/bitsocialnet/seedit/commit/bbbbbbb))',
        '',
        '## [0.5.9](https://example.com/compare) (2025-08-19)',
        '',
        '### Features',
        '',
        '* add one ([ccccccc](https://github.com/bitsocialnet/seedit/commit/ccccccc))',
      ].join('\n'),
    );

    expect(releases.map((release) => release.version)).toEqual(['0.5.10', '0.5.9']);
    expect(releases[0].sections.map((section) => section.title)).toEqual(['Bug Fixes', 'Performance Improvements']);
    expect(releases[1].sections).toHaveLength(1);
    expect(textOf(releases[1].sections[0].entries[0])).toBe('add one');
  });

  it('drops a section heading that carries no entries', () => {
    const releases = parseChangelog(
      [
        '## [0.5.10](https://example.com/compare) (2025-09-26)',
        '',
        '### Bug Fixes',
        '',
        '* fix one ([aaaaaaa](https://github.com/bitsocialnet/seedit/commit/aaaaaaa))',
        '',
        '### Reverts',
        '',
      ].join('\n'),
    );

    expect(releases[0].sections.map((section) => section.title)).toEqual(['Bug Fixes']);
  });

  it('keeps entries that appear before any section heading', () => {
    const releases = parseChangelog(
      ['## [0.1.0](https://example.com/compare) (2025-01-01)', '', '* early commit ([ddddddd](https://github.com/bitsocialnet/seedit/commit/ddddddd))'].join('\n'),
    );

    expect(releases[0].sections[0].title).toBe('');
    expect(textOf(releases[0].sections[0].entries[0])).toBe('early commit');
  });

  it('ignores content that appears before the first release heading', () => {
    const releases = parseChangelog(['# Changelog', '', 'All notable changes.', '', '* stray bullet ([eeeeeee](https://example.com/eeeeeee))'].join('\n'));

    expect(releases).toEqual([]);
  });

  it('parses the repository changelog into releases that all carry a version and date', () => {
    const releases = parseChangelog(changelogMarkdown);

    expect(releases.length).toBeGreaterThan(0);
    for (const release of releases) {
      expect(release.version).toMatch(/^\d+\.\d+\.\d+/);
      expect(release.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('parses every bullet of the repository changelog into an entry', () => {
    const bulletCount = changelogMarkdown.split('\n').filter((line) => /^\*\s+\S/.test(line)).length;
    const entryCount = parseChangelog(changelogMarkdown).reduce(
      (total, release) => total + release.sections.reduce((sectionTotal, section) => sectionTotal + section.entries.length, 0),
      0,
    );

    expect(entryCount).toBe(bulletCount);
  });

  it('leaves no raw markdown links in the repository changelog descriptions', () => {
    for (const release of parseChangelog(changelogMarkdown)) {
      for (const section of release.sections) {
        for (const entry of section.entries) {
          expect(textOf(entry)).not.toContain('](');
        }
      }
    }
  });
});

describe('getReleaseAnchorId', () => {
  it('builds an anchor that is safe to pass to querySelector', () => {
    expect(getReleaseAnchorId('0.5.10')).toBe('v0-5-10');
  });
});
