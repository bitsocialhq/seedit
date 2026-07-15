import { useState } from 'react';
import { useAccount, type Account } from '@bitsocial/bitsocial-react-hooks';
import { useStarterCommunityList } from './use-default-subscriptions';
import { persistStarterAccountUpdate } from '../lib/utils/starter-account-persistence';
import {
  addSelectedStarterSubscriptions,
  getStarterSetDelta,
  isStarterListRevisionCurrent,
  keepCurrentStarterSubscriptions,
  replacePreviousStarterSubscriptions,
  shouldShowStarterSetUpdateNotice,
  type SeeditStarterSubscriptions,
  type StarterSubscriptionsResult,
} from '../lib/utils/starter-subscriptions';

type StarterAccount = Account & {
  seeditStarterSubscriptions?: SeeditStarterSubscriptions;
};

const EMPTY_SUBSCRIPTIONS: string[] = [];

export const useStarterSubscriptions = () => {
  const account = useAccount() as StarterAccount | undefined;
  const { list, loading, error } = useStarterCommunityList();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);
  const starterAddresses = list.communities.map(({ address }) => address);
  const provenance = account?.seeditStarterSubscriptions;
  const subscriptions = account?.subscriptions ?? EMPTY_SUBSCRIPTIONS;
  const delta = getStarterSetDelta(provenance, starterAddresses);
  const hasUpdate = shouldShowStarterSetUpdateNotice(provenance, list.revision, starterAddresses);
  const canReview = isStarterListRevisionCurrent(provenance, list.revision);

  const persist = (computeResult: (currentAccount: StarterAccount) => StarterSubscriptionsResult) => {
    if (!account) return Promise.resolve();
    setSaving(true);
    setSaveError(null);
    return Promise.resolve()
      .then(() =>
        persistStarterAccountUpdate(account.id, (currentAccount) => {
          const result = computeResult(currentAccount);
          return {
            ...currentAccount,
            subscriptions: result.subscriptions,
            seeditStarterSubscriptions: result.provenance,
          };
        }),
      )
      .catch((persistError) => {
        const normalizedError = persistError instanceof Error ? persistError : new Error(String(persistError));
        console.error('Default subscriptions update error:', normalizedError);
        setSaveError(normalizedError);
      })
      .finally(() => setSaving(false));
  };

  const addSelected = (selectedAddresses: readonly string[]) =>
    persist((currentAccount) =>
      addSelectedStarterSubscriptions({
        subscriptions: currentAccount.subscriptions ?? EMPTY_SUBSCRIPTIONS,
        provenance: currentAccount.seeditStarterSubscriptions,
        revision: list.revision,
        starterAddresses,
        selectedAddresses,
      }),
    );

  const keepCurrent = () =>
    persist((currentAccount) =>
      keepCurrentStarterSubscriptions({
        subscriptions: currentAccount.subscriptions ?? EMPTY_SUBSCRIPTIONS,
        provenance: currentAccount.seeditStarterSubscriptions,
        revision: list.revision,
        starterAddresses,
      }),
    );

  const replacePrevious = () =>
    persist((currentAccount) =>
      replacePreviousStarterSubscriptions({
        subscriptions: currentAccount.subscriptions ?? EMPTY_SUBSCRIPTIONS,
        provenance: currentAccount.seeditStarterSubscriptions,
        revision: list.revision,
        starterAddresses,
      }),
    );

  return {
    list,
    subscriptions,
    provenance,
    delta,
    hasUpdate,
    loading,
    error,
    saveError,
    saving,
    canReview,
    addSelected,
    keepCurrent,
    replacePrevious,
  };
};
