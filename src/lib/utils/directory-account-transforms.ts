import type { StarterAccount } from './starter-account';
import {
  dismissAutomaticDirectoryChange,
  joinDirectorySubscription,
  keepBothDirectorySubscriptions,
  keepCurrentDirectorySubscription,
  observeDirectoryWinnerChanges,
  reconcileAutomaticDirectorySwitches,
  setDirectoryAutoSwitch,
  switchDirectorySubscription,
  undoAutomaticDirectorySwitch,
  type AuthoritativeDirectoryWinnerSnapshot,
  type DirectoryAutomaticChangeNotice,
  type DirectorySubscriptionsState,
} from './directory-subscriptions';
import type { SeeditDirectoryCode } from './directory-codes';
import { acknowledgeStarterDirectoryChange } from './starter-subscriptions';

export type ManualDirectoryWinnerAction = 'keep' | 'keepBoth' | 'switch';

const applyDirectoryState = (account: StarterAccount, result: DirectorySubscriptionsState, starterProvenance = account.seeditStarterSubscriptions): StarterAccount => ({
  ...account,
  subscriptions: result.subscriptions,
  seeditDirectoryPreferences: result.preferences,
  ...(starterProvenance ? { seeditStarterSubscriptions: starterProvenance } : {}),
});

const acceptedWinner = (result: DirectorySubscriptionsState, winner: AuthoritativeDirectoryWinnerSnapshot): boolean => {
  const slot = result.preferences.slots[winner.directoryCode];
  return slot?.acknowledgedWinner.address === winner.address && slot.acknowledgedWinner.revision === winner.revision;
};

const advanceStarterProvenance = (
  account: StarterAccount,
  previousAddress: string | undefined,
  winner: AuthoritativeDirectoryWinnerSnapshot,
  result: DirectorySubscriptionsState,
  choice: 'keep' | 'trackWinner',
) =>
  previousAddress && acceptedWinner(result, winner)
    ? acknowledgeStarterDirectoryChange(account.seeditStarterSubscriptions, previousAddress, winner.address, choice)
    : account.seeditStarterSubscriptions;

const restoreStarterProvenanceTransition = (
  current: StarterAccount['seeditStarterSubscriptions'],
  transition: DirectoryAutomaticChangeNotice['starterProvenanceTransition'],
  fromAddress: string,
  toAddress: string,
) => {
  if (!current || !transition) return current;

  const restoreEndpointMembership = (currentAddresses: string[], beforeAddresses: string[], afterAddresses: string[]): string[] => {
    const endpoints = [fromAddress, toAddress];
    const currentMatchesAfter = endpoints.every((address) => currentAddresses.includes(address) === afterAddresses.includes(address));
    if (!currentMatchesAfter) return currentAddresses;

    const restored = currentAddresses.filter((address) => !endpoints.includes(address));
    for (const address of endpoints) {
      if (beforeAddresses.includes(address)) restored.push(address);
    }
    return restored;
  };

  return {
    ...current,
    knownAddresses: restoreEndpointMembership(current.knownAddresses, transition.before.knownAddresses, transition.after.knownAddresses),
    managedAddresses: restoreEndpointMembership(current.managedAddresses, transition.before.managedAddresses, transition.after.managedAddresses),
  };
};

/** Join the exact winner, advance its slot, and keep starter ownership aligned atomically. */
export const joinDirectoryWinnerAccount = (account: StarterAccount, winner: AuthoritativeDirectoryWinnerSnapshot): StarterAccount => {
  const previousAddress = account.seeditDirectoryPreferences?.slots?.[winner.directoryCode]?.subscriptionAddress;
  const result = joinDirectorySubscription({
    subscriptions: account.subscriptions ?? [],
    preferences: account.seeditDirectoryPreferences,
    winner,
  });
  const provenance =
    previousAddress && previousAddress !== winner.address
      ? advanceStarterProvenance(account, previousAddress, winner, result, 'trackWinner')
      : account.seeditStarterSubscriptions;
  return applyDirectoryState(account, result, provenance);
};

export const setDirectoryWinnerAutoSwitchAccount = (account: StarterAccount, winner: AuthoritativeDirectoryWinnerSnapshot, enabled: boolean): StarterAccount => {
  const previousAddress = account.seeditDirectoryPreferences?.slots?.[winner.directoryCode]?.subscriptionAddress;
  const joined = enabled
    ? joinDirectorySubscription({ subscriptions: account.subscriptions ?? [], preferences: account.seeditDirectoryPreferences, winner })
    : { subscriptions: account.subscriptions ?? [], preferences: account.seeditDirectoryPreferences };
  const result = setDirectoryAutoSwitch({ ...joined, directoryCode: winner.directoryCode, enabled });
  const provenance =
    enabled && previousAddress && previousAddress !== winner.address
      ? advanceStarterProvenance(account, previousAddress, winner, result, 'trackWinner')
      : account.seeditStarterSubscriptions;
  return applyDirectoryState(account, result, provenance);
};

export const applyManualDirectoryWinnerAccount = (
  account: StarterAccount,
  winner: AuthoritativeDirectoryWinnerSnapshot,
  action: ManualDirectoryWinnerAction,
): StarterAccount => {
  const previousAddress = account.seeditDirectoryPreferences?.slots?.[winner.directoryCode]?.subscriptionAddress;
  const input = { subscriptions: account.subscriptions ?? [], preferences: account.seeditDirectoryPreferences, winner };
  const result =
    action === 'switch' ? switchDirectorySubscription(input) : action === 'keepBoth' ? keepBothDirectorySubscriptions(input) : keepCurrentDirectorySubscription(input);
  const provenance = advanceStarterProvenance(account, previousAddress, winner, result, action === 'keep' ? 'keep' : 'trackWinner');
  return applyDirectoryState(account, result, provenance);
};

export const reconcileDirectoryWinnerAccount = (account: StarterAccount, winner: AuthoritativeDirectoryWinnerSnapshot): StarterAccount => {
  const automaticState = reconcileAutomaticDirectorySwitches({
    subscriptions: account.subscriptions ?? [],
    preferences: account.seeditDirectoryPreferences,
    winners: [winner],
  });
  const observedState = observeDirectoryWinnerChanges({ ...automaticState, winners: [winner] });
  const notice = observedState.preferences.automaticChangeNotices[winner.directoryCode];
  const provenance =
    notice?.toAddress === winner.address && notice.winnerRevision === winner.revision
      ? acknowledgeStarterDirectoryChange(account.seeditStarterSubscriptions, notice.fromAddress, notice.toAddress, 'trackWinner')
      : account.seeditStarterSubscriptions;
  const provenanceChanged = JSON.stringify(provenance) !== JSON.stringify(account.seeditStarterSubscriptions);
  const preferences =
    notice && provenanceChanged && account.seeditStarterSubscriptions && provenance && !notice.starterProvenanceTransition
      ? {
          ...observedState.preferences,
          automaticChangeNotices: {
            ...observedState.preferences.automaticChangeNotices,
            [winner.directoryCode]: {
              ...notice,
              starterProvenanceTransition: { before: account.seeditStarterSubscriptions, after: provenance },
            },
          },
        }
      : observedState.preferences;
  return applyDirectoryState(account, { ...observedState, preferences }, provenance);
};

export const resolveAutomaticDirectoryNoticeAccount = (account: StarterAccount, directoryCode: SeeditDirectoryCode, action: 'dismiss' | 'undo'): StarterAccount => {
  const notice = account.seeditDirectoryPreferences?.automaticChangeNotices?.[directoryCode];
  const input = { subscriptions: account.subscriptions ?? [], preferences: account.seeditDirectoryPreferences, directoryCode };
  const result = action === 'undo' ? undoAutomaticDirectorySwitch(input) : dismissAutomaticDirectoryChange(input);
  const resultingSlot = result.preferences.slots[directoryCode];
  const undoApplied =
    action === 'undo' && notice && resultingSlot?.subscriptionAddress === notice.fromAddress && !result.preferences.automaticChangeNotices[directoryCode];
  const provenance = undoApplied
    ? restoreStarterProvenanceTransition(account.seeditStarterSubscriptions, notice.starterProvenanceTransition, notice.fromAddress, notice.toAddress)
    : account.seeditStarterSubscriptions;
  return applyDirectoryState(account, result, provenance);
};
