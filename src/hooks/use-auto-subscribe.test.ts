import { describe, expect, it } from 'vitest';
import { computeStarterAccount, type StarterAccount } from '../lib/utils/starter-account';

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
});
