import { describe, expect, it } from 'vitest';
import { isCommunitiesDirectoryView } from './view-utils';

describe('isCommunitiesDirectoryView', () => {
  it('matches the directory index and individual directories only', () => {
    expect(isCommunitiesDirectoryView('/communities/directories')).toBe(true);
    expect(isCommunitiesDirectoryView('/communities/directories/askseedit')).toBe(true);
    expect(isCommunitiesDirectoryView('/communities/directories-extra')).toBe(false);
    expect(isCommunitiesDirectoryView('/communities/vote')).toBe(false);
  });
});
