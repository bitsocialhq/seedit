import accountsDatabase from '@bitsocial/bitsocial-react-hooks/dist/stores/accounts/accounts-database.js';
import accountsStore from '@bitsocial/bitsocial-react-hooks/dist/stores/accounts/accounts-store.js';
import { persistRebasedStarterAccount, type StarterAccount } from './starter-account';

const getStoreAccountById = (accountId: string): StarterAccount | undefined => accountsStore.getState().accounts[accountId] as StarterAccount | undefined;

const setStoreAccountIfCurrent = (accountId: string, expectedAccount: StarterAccount, nextAccount: StarterAccount) => {
  accountsStore.setState((state) => {
    if (state.accounts[accountId] !== expectedAccount) return {};
    return {
      accounts: {
        ...state.accounts,
        [accountId]: nextAccount,
      },
    };
  });
};

export const persistStarterAccountUpdate = (accountId: string, computeAccount: (account: StarterAccount) => StarterAccount): Promise<void> =>
  persistRebasedStarterAccount({
    getCurrentAccount: () => getStoreAccountById(accountId),
    computeAccount,
    persistAccount: (account) => accountsDatabase.addAccount(account),
    updateAccountIfCurrent: (expectedAccount, nextAccount) => setStoreAccountIfCurrent(accountId, expectedAccount, nextAccount),
  });
