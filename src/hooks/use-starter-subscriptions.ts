import { useState } from 'react';
import { setAccount, useAccount, type Account } from '@bitsocial/bitsocial-react-hooks';
import { useStarterCommunityList } from './use-default-subscriptions';
import {
  addSelectedStarterSubscriptions,
  getStarterSetDelta,
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
  const starterAddresses = list.communities.map(({ address }) => address);
  const provenance = account?.seeditStarterSubscriptions;
  const subscriptions = account?.subscriptions ?? EMPTY_SUBSCRIPTIONS;
  const delta = getStarterSetDelta(provenance, starterAddresses);
  const hasUpdate = shouldShowStarterSetUpdateNotice(provenance, list.revision, starterAddresses);

  const persist = (result: StarterSubscriptionsResult) => {
    if (!account) return Promise.resolve();
    setSaving(true);
    return Promise.resolve()
      .then(() =>
        setAccount({
          ...account,
          subscriptions: result.subscriptions,
          seeditStarterSubscriptions: result.provenance,
        }),
      )
      .finally(() => setSaving(false));
  };

  const addSelected = (selectedAddresses: readonly string[]) =>
    persist(
      addSelectedStarterSubscriptions({
        subscriptions,
        provenance,
        revision: list.revision,
        starterAddresses,
        selectedAddresses,
      }),
    );

  const keepCurrent = () =>
    persist(
      keepCurrentStarterSubscriptions({
        subscriptions,
        provenance,
        revision: list.revision,
        starterAddresses,
      }),
    );

  const replacePrevious = () =>
    persist(
      replacePreviousStarterSubscriptions({
        subscriptions,
        provenance,
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
    saving,
    addSelected,
    keepCurrent,
    replacePrevious,
  };
};
