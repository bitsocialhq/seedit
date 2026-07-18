import { describe, expect, it } from 'vitest';
import { getEditableAccountData } from './account-data-utils';

describe('getEditableAccountData', () => {
  it('omits runtime-only account and author fields without mutating the source', () => {
    const avatar = { url: 'https://example.com/avatar.png' };
    const account = {
      name: 'Account 1',
      author: { address: '12D3KooWExample', shortAddress: '12D3...mple', avatar },
      pkc: { state: 'ready' },
      pkcReactOptions: { cache: true },
      karma: { postScore: 2, replyScore: 3 },
      unreadNotificationCount: 4,
      pkcOptions: { httpRoutersOptions: ['https://routing.example'] },
    };

    expect(getEditableAccountData(account)).toEqual({
      name: 'Account 1',
      author: { address: '12D3KooWExample', shortAddress: '12D3...mple' },
      pkcOptions: { httpRoutersOptions: ['https://routing.example'] },
    });
    expect(account.author.avatar).toBe(avatar);
  });

  it('returns empty editable data when no account is loaded', () => {
    expect(getEditableAccountData(undefined)).toEqual({});
  });
});
