import { describe, expect, it } from 'vitest';
import type { StarterAccount } from './starter-account';
import {
  applyManualDirectoryWinnerAccount,
  joinDirectoryWinnerAccount,
  reconcileDirectoryWinnerAccount,
  resolveAutomaticDirectoryNoticeAccount,
  setDirectoryWinnerAutoSwitchAccount,
} from './directory-account-transforms';
import type { AuthoritativeDirectoryWinnerSnapshot, SeeditDirectoryPreferences } from './directory-subscriptions';

const winner = (address: string, revision: number): AuthoritativeDirectoryWinnerSnapshot => ({
  directoryCode: 'funny',
  address,
  revision,
  authoritative: true,
});

const account = (autoSwitch = false): StarterAccount =>
  ({
    subscriptions: ['funny-a.bso'],
    seeditDirectoryPreferences: {
      schemaVersion: 1,
      slots: {
        funny: {
          subscriptionAddress: 'funny-a.bso',
          autoSwitch,
          acknowledgedWinner: { address: 'funny-a.bso', revision: 1 },
        },
      },
      automaticChangeNotices: {},
    } satisfies SeeditDirectoryPreferences,
    seeditStarterSubscriptions: {
      schemaVersion: 1,
      acknowledgedRevision: 2,
      knownAddresses: ['funny-a.bso'],
      managedAddresses: ['funny-a.bso'],
    },
  }) as StarterAccount;

describe('directory account transforms', () => {
  it('joins a newer exact winner while advancing both provenance models', () => {
    const result = joinDirectoryWinnerAccount(account(), winner('funny-b.bso', 2));

    expect(result.subscriptions).toEqual(['funny-a.bso', 'funny-b.bso']);
    expect(result.seeditDirectoryPreferences?.slots.funny?.subscriptionAddress).toBe('funny-b.bso');
    expect(result.seeditStarterSubscriptions).toMatchObject({
      knownAddresses: ['funny-b.bso'],
      managedAddresses: ['funny-b.bso'],
    });
  });

  it('does not mutate starter provenance when a stale manual action is rejected', () => {
    const newer = joinDirectoryWinnerAccount(account(), winner('funny-c.bso', 3));
    const result = applyManualDirectoryWinnerAccount(newer, winner('funny-b.bso', 2), 'switch');

    expect(result.subscriptions).toEqual(newer.subscriptions);
    expect(result.seeditDirectoryPreferences).toEqual(newer.seeditDirectoryPreferences);
    expect(result.seeditStarterSubscriptions).toEqual(newer.seeditStarterSubscriptions);
  });

  it('adopts the current winner when auto-switch is enabled after a previously acknowledged change', () => {
    const keptPrevious = account();
    keptPrevious.subscriptions = ['funny-a.bso', 'funny-b.bso'];
    keptPrevious.seeditDirectoryPreferences!.slots.funny!.acknowledgedWinner = { address: 'funny-b.bso', revision: 2 };

    const result = setDirectoryWinnerAutoSwitchAccount(keptPrevious, winner('funny-b.bso', 2), true);

    expect(result.subscriptions).toEqual(['funny-b.bso']);
    expect(result.seeditDirectoryPreferences?.slots.funny).toEqual({
      subscriptionAddress: 'funny-b.bso',
      autoSwitch: true,
      acknowledgedWinner: { address: 'funny-b.bso', revision: 2 },
    });
    expect(result.seeditStarterSubscriptions).toMatchObject({
      knownAddresses: ['funny-b.bso'],
      managedAddresses: ['funny-b.bso'],
    });
  });

  it('restores starter ownership when an automatic switch is undone', () => {
    const switched = reconcileDirectoryWinnerAccount(account(true), winner('funny-b.bso', 2));
    expect(switched.subscriptions).toEqual(['funny-b.bso']);
    expect(switched.seeditStarterSubscriptions?.managedAddresses).toEqual(['funny-b.bso']);

    const undone = resolveAutomaticDirectoryNoticeAccount(switched, 'funny', 'undo');
    expect(undone.subscriptions).toEqual(['funny-a.bso']);
    expect(undone.seeditStarterSubscriptions).toMatchObject({
      knownAddresses: ['funny-a.bso'],
      managedAddresses: ['funny-a.bso'],
    });
    expect(undone.seeditDirectoryPreferences?.slots.funny?.autoSwitch).toBe(false);
  });

  it('does not steal unrelated starter ownership when a manual directory subscription is undone', () => {
    const manualDirectoryAccount = account(true);
    manualDirectoryAccount.subscriptions = ['funny-a.bso', 'funny-b.bso'];
    manualDirectoryAccount.seeditStarterSubscriptions = {
      schemaVersion: 1,
      acknowledgedRevision: 2,
      knownAddresses: ['funny-b.bso'],
      managedAddresses: ['funny-b.bso'],
    };

    const switched = reconcileDirectoryWinnerAccount(manualDirectoryAccount, winner('funny-b.bso', 2));
    expect(switched.seeditDirectoryPreferences?.automaticChangeNotices.funny?.starterProvenanceTransition).toBeUndefined();

    const undone = resolveAutomaticDirectoryNoticeAccount(switched, 'funny', 'undo');
    expect(undone.subscriptions).toEqual(['funny-b.bso', 'funny-a.bso']);
    expect(undone.seeditStarterSubscriptions).toEqual(manualDirectoryAccount.seeditStarterSubscriptions);
  });

  it('preserves later starter-list changes when undoing an automatic switch', () => {
    const switched = reconcileDirectoryWinnerAccount(account(true), winner('funny-b.bso', 2));
    const withLaterStarterChange = {
      ...switched,
      seeditStarterSubscriptions: {
        ...switched.seeditStarterSubscriptions!,
        acknowledgedRevision: 3,
        knownAddresses: [...switched.seeditStarterSubscriptions!.knownAddresses, 'later-default.bso'],
        managedAddresses: [...switched.seeditStarterSubscriptions!.managedAddresses, 'later-default.bso'],
      },
    } as StarterAccount;

    const undone = resolveAutomaticDirectoryNoticeAccount(withLaterStarterChange, 'funny', 'undo');
    expect(undone.seeditStarterSubscriptions).toEqual({
      schemaVersion: 1,
      acknowledgedRevision: 3,
      knownAddresses: ['later-default.bso', 'funny-a.bso'],
      managedAddresses: ['later-default.bso', 'funny-a.bso'],
    });
  });
});
