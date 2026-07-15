import { describe, expect, it } from 'vitest';
import { STARTER_COMMUNITY_ADDRESSES } from '../lib/utils/legacy-default-subscriptions';
import { computeStarterAccount, hasExistingSeeditAccountState, persistRebasedStarterAccount, type StarterAccount } from '../lib/utils/starter-account';

describe('computeStarterAccount', () => {
  it('bootstraps a new account from the accepted live default-community revision', () => {
    const account = { subscriptions: [] } as StarterAccount;

    expect(
      computeStarterAccount(account, false, {
        revision: 2,
        communities: [{ address: 'new-default.bso' }, { address: 'another-default.bso' }],
      }),
    ).toMatchObject({
      subscriptions: ['new-default.bso', 'another-default.bso'],
      seeditStarterSubscriptions: {
        acknowledgedRevision: 2,
        knownAddresses: ['new-default.bso', 'another-default.bso'],
        managedAddresses: ['new-default.bso', 'another-default.bso'],
      },
    });
  });

  it('merges migrated directory ownership into existing provenance', () => {
    const account = {
      subscriptions: ['aww', 'manual.bso'],
      seeditStarterSubscriptions: {
        schemaVersion: 1,
        acknowledgedRevision: 1,
        knownAddresses: ['old-default.bso'],
        managedAddresses: ['old-default.bso'],
      },
    } as StarterAccount;

    expect(computeStarterAccount(account, true, { revision: 2, communities: [{ address: 'new-default.bso' }] })).toMatchObject({
      subscriptions: ['aww-posting.bso', 'manual.bso'],
      seeditStarterSubscriptions: {
        acknowledgedRevision: 1,
        knownAddresses: ['old-default.bso'],
        managedAddresses: ['old-default.bso', 'aww-posting.bso'],
      },
    });
  });

  it('initializes provenance from a legacy directory migration without claiming manual subscriptions', () => {
    const account = { subscriptions: ['aww', 'manual.bso'] } as StarterAccount;

    expect(computeStarterAccount(account, true, { revision: 2, communities: [{ address: 'new-default.bso' }] })).toMatchObject({
      subscriptions: ['aww-posting.bso', 'manual.bso'],
      seeditStarterSubscriptions: {
        acknowledgedRevision: 1,
        knownAddresses: STARTER_COMMUNITY_ADDRESSES,
        managedAddresses: ['aww-posting.bso'],
      },
    });
  });

  it('does not bootstrap a known existing account with no subscriptions', () => {
    const account = { subscriptions: [] } as StarterAccount;

    expect(computeStarterAccount(account, true, { revision: 2, communities: [{ address: 'new-default.bso' }] })).toMatchObject({
      subscriptions: [],
      seeditStarterSubscriptions: {
        acknowledgedRevision: 2,
        knownAddresses: ['new-default.bso'],
        managedAddresses: [],
      },
    });
  });
});

describe('hasExistingSeeditAccountState', () => {
  const accountAddress = 'existing-user-address';

  it('recognizes imported accounts even when old Seedit migration flags are absent', () => {
    const values = new Map([['importedAccountAddress', accountAddress]]);
    expect(hasExistingSeeditAccountState(accountAddress, (key) => values.get(key) ?? null)).toBe(true);
  });

  it('does not classify an unflagged locally created account as existing', () => {
    expect(hasExistingSeeditAccountState(accountAddress, () => null)).toBe(false);
  });
});

describe('persistRebasedStarterAccount', () => {
  it('repairs a stale write with the concurrent store snapshot when rebasing is a no-op', async () => {
    const sourceAccount = { subscriptions: [] } as StarterAccount;
    const concurrentAccount = { subscriptions: ['starter.bso', 'manual.bso'] } as StarterAccount;
    let currentAccount = sourceAccount;
    const persistedAccounts: StarterAccount[] = [];

    await persistRebasedStarterAccount({
      getCurrentAccount: () => currentAccount,
      computeAccount: (account) =>
        account.subscriptions?.includes('starter.bso') ? account : ({ ...account, subscriptions: [...(account.subscriptions ?? []), 'starter.bso'] } as StarterAccount),
      persistAccount: async (account) => {
        persistedAccounts.push(account);
        if (persistedAccounts.length === 1) currentAccount = concurrentAccount;
      },
      updateAccountIfCurrent: (expectedAccount, nextAccount) => {
        if (currentAccount === expectedAccount) currentAccount = nextAccount;
      },
    });

    expect(persistedAccounts.map(({ subscriptions }) => subscriptions)).toEqual([['starter.bso'], ['starter.bso', 'manual.bso']]);
    expect(currentAccount).toBe(concurrentAccount);
  });
});
