import { useCallback, useMemo, useState } from 'react';
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
  const starterAddresses = useMemo(() => list.communities.map(({ address }) => address), [list.communities]);
  const provenance = account?.seeditStarterSubscriptions;
  const subscriptions = account?.subscriptions ?? EMPTY_SUBSCRIPTIONS;
  const delta = useMemo(() => getStarterSetDelta(provenance, starterAddresses), [provenance, starterAddresses]);
  const hasUpdate = shouldShowStarterSetUpdateNotice(provenance, list.revision, starterAddresses);

  const persist = useCallback(
    async (result: StarterSubscriptionsResult) => {
      if (!account) return;
      setSaving(true);
      try {
        await setAccount({
          ...account,
          subscriptions: result.subscriptions,
          seeditStarterSubscriptions: result.provenance,
        });
      } finally {
        setSaving(false);
      }
    },
    [account],
  );

  const addSelected = useCallback(
    (selectedAddresses: readonly string[]) =>
      persist(
        addSelectedStarterSubscriptions({
          subscriptions,
          provenance,
          revision: list.revision,
          starterAddresses,
          selectedAddresses,
        }),
      ),
    [list.revision, persist, provenance, starterAddresses, subscriptions],
  );

  const keepCurrent = useCallback(
    () =>
      persist(
        keepCurrentStarterSubscriptions({
          subscriptions,
          provenance,
          revision: list.revision,
          starterAddresses,
        }),
      ),
    [list.revision, persist, provenance, starterAddresses, subscriptions],
  );

  const replacePrevious = useCallback(
    () =>
      persist(
        replacePreviousStarterSubscriptions({
          subscriptions,
          provenance,
          revision: list.revision,
          starterAddresses,
        }),
      ),
    [list.revision, persist, provenance, starterAddresses, subscriptions],
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
