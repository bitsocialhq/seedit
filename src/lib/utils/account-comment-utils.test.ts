import { describe, expect, it } from 'vitest';
import { getAccountCommentIndex, MISSING_ACCOUNT_COMMENT_INDEX } from './account-comment-utils';

describe('account-comment-utils', () => {
  it('parses route params into valid account comment indexes', () => {
    expect(getAccountCommentIndex('0')).toBe(0);
    expect(getAccountCommentIndex('12')).toBe(12);
    expect(getAccountCommentIndex(3)).toBe(3);
  });

  it('rejects missing and invalid indexes so the hook can use a safe sentinel', () => {
    expect(getAccountCommentIndex(undefined)).toBeUndefined();
    expect(getAccountCommentIndex('')).toBeUndefined();
    expect(getAccountCommentIndex('1.2')).toBeUndefined();
    expect(getAccountCommentIndex('1e2')).toBeUndefined();
    expect(getAccountCommentIndex(-1)).toBeUndefined();
    expect(MISSING_ACCOUNT_COMMENT_INDEX).toBeLessThan(0);
  });
});
