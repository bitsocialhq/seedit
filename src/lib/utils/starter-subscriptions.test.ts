import { describe, expect, it } from 'vitest';
import {
  SEEDIT_STARTER_SUBSCRIPTIONS_SCHEMA_VERSION,
  addSelectedStarterSubscriptions,
  bootstrapStarterSubscriptions,
  getStarterSetDelta,
  initializeStarterSubscriptions,
  keepCurrentStarterSubscriptions,
  leaveStarterSubscription,
  replacePreviousStarterSubscriptions,
  shouldShowStarterSetUpdateNotice,
  type SeeditStarterSubscriptions,
} from './starter-subscriptions';

const provenance = (overrides: Partial<SeeditStarterSubscriptions> = {}): SeeditStarterSubscriptions => ({
  schemaVersion: SEEDIT_STARTER_SUBSCRIPTIONS_SCHEMA_VERSION,
  acknowledgedRevision: 1,
  knownAddresses: ['old.bso', 'stays.bso'],
  managedAddresses: ['old.bso', 'stays.bso'],
  ...overrides,
});

describe('starter-set delta and notices', () => {
  it('reports additions in current-list order and removals in known-list order', () => {
    expect(getStarterSetDelta(provenance(), ['stays.bso', 'new-two.bso', 'new-one.bso', 'new-two.bso'])).toEqual({
      addedAddresses: ['new-two.bso', 'new-one.bso'],
      removedAddresses: ['old.bso'],
    });
  });

  it('shows a notice only for a newer revision with a membership change', () => {
    expect(shouldShowStarterSetUpdateNotice(provenance(), 2, ['stays.bso', 'new.bso'])).toBe(true);
    expect(shouldShowStarterSetUpdateNotice(provenance(), 1, ['stays.bso', 'new.bso'])).toBe(false);
    expect(shouldShowStarterSetUpdateNotice(provenance(), 2, ['old.bso', 'stays.bso'])).toBe(false);
    expect(shouldShowStarterSetUpdateNotice(undefined, 2, ['new.bso'])).toBe(false);
  });
});

describe('starter-subscription initialization', () => {
  it('initializes an existing account without changing or managing its subscriptions', () => {
    expect(
      initializeStarterSubscriptions({
        subscriptions: ['manual.bso', 'manual.bso'],
        revision: 3,
        starterAddresses: ['starter.bso', 'starter.bso'],
      }),
    ).toEqual({
      subscriptions: ['manual.bso'],
      provenance: {
        schemaVersion: 1,
        acknowledgedRevision: 3,
        knownAddresses: ['starter.bso'],
        managedAddresses: [],
      },
    });
  });

  it('does not acknowledge a later revision once provenance exists', () => {
    const existing = provenance();
    expect(
      initializeStarterSubscriptions({
        subscriptions: ['old.bso'],
        provenance: existing,
        revision: 5,
        starterAddresses: ['new.bso'],
      }).provenance,
    ).toEqual(existing);
  });

  it('bootstraps missing starter addresses but leaves an already-subscribed starter manual', () => {
    expect(
      bootstrapStarterSubscriptions({
        subscriptions: ['manual.bso', 'starter-one.bso'],
        revision: 4,
        starterAddresses: ['starter-one.bso', 'starter-two.bso', 'starter-two.bso'],
      }),
    ).toEqual({
      subscriptions: ['manual.bso', 'starter-one.bso', 'starter-two.bso'],
      provenance: {
        schemaVersion: 1,
        acknowledgedRevision: 4,
        knownAddresses: ['starter-one.bso', 'starter-two.bso'],
        managedAddresses: ['starter-two.bso'],
      },
    });
  });

  it('does not bootstrap again after provenance exists', () => {
    const existing = provenance({ knownAddresses: ['starter.bso'], managedAddresses: [] });
    expect(
      bootstrapStarterSubscriptions({
        subscriptions: [],
        provenance: existing,
        revision: 2,
        starterAddresses: ['starter.bso'],
      }),
    ).toEqual({ subscriptions: [], provenance: existing });
  });
});

describe('starter-subscription update choices', () => {
  it('adds only selected current-list addresses and never manages an existing manual subscription', () => {
    expect(
      addSelectedStarterSubscriptions({
        subscriptions: ['manual.bso', 'already-manual.bso'],
        provenance: provenance({ managedAddresses: [] }),
        revision: 2,
        starterAddresses: ['already-manual.bso', 'new.bso'],
        selectedAddresses: ['not-current.bso', 'already-manual.bso', 'new.bso', 'new.bso'],
      }),
    ).toEqual({
      subscriptions: ['manual.bso', 'already-manual.bso', 'new.bso'],
      provenance: {
        schemaVersion: 1,
        acknowledgedRevision: 2,
        knownAddresses: ['already-manual.bso', 'new.bso'],
        managedAddresses: ['new.bso'],
      },
    });
  });

  it('adds selected communities in starter-list order regardless of selection order', () => {
    const result = addSelectedStarterSubscriptions({
      subscriptions: ['manual.bso'],
      provenance: provenance({ managedAddresses: [] }),
      revision: 2,
      starterAddresses: ['one.bso', 'two.bso', 'three.bso'],
      selectedAddresses: ['three.bso', 'one.bso'],
    });

    expect(result.subscriptions).toEqual(['manual.bso', 'one.bso', 'three.bso']);
    expect(result.provenance.managedAddresses).toEqual(['one.bso', 'three.bso']);
  });

  it('keeps subscriptions and managed ownership while acknowledging the new snapshot', () => {
    expect(
      keepCurrentStarterSubscriptions({
        subscriptions: ['manual.bso', 'old.bso'],
        provenance: provenance(),
        revision: 2,
        starterAddresses: ['stays.bso', 'new.bso'],
      }),
    ).toEqual({
      subscriptions: ['manual.bso', 'old.bso'],
      provenance: {
        schemaVersion: 1,
        acknowledgedRevision: 2,
        knownAddresses: ['stays.bso', 'new.bso'],
        managedAddresses: ['old.bso', 'stays.bso'],
      },
    });
  });

  it('replaces only active managed subscriptions and preserves manual subscriptions', () => {
    expect(
      replacePreviousStarterSubscriptions({
        subscriptions: ['manual.bso', 'old.bso', 'stays.bso', 'demoted-manual.bso', 'already-manual-current.bso'],
        provenance: provenance({ managedAddresses: ['old.bso', 'stays.bso', 'stale-managed.bso'] }),
        revision: 2,
        starterAddresses: ['stays.bso', 'already-manual-current.bso', 'new.bso'],
      }),
    ).toEqual({
      subscriptions: ['manual.bso', 'stays.bso', 'demoted-manual.bso', 'already-manual-current.bso', 'new.bso'],
      provenance: {
        schemaVersion: 1,
        acknowledgedRevision: 2,
        knownAddresses: ['stays.bso', 'already-manual-current.bso', 'new.bso'],
        managedAddresses: ['stays.bso', 'new.bso'],
      },
    });
  });

  it('is idempotent when replacement is applied repeatedly', () => {
    const first = replacePreviousStarterSubscriptions({
      subscriptions: ['manual.bso', 'old.bso'],
      provenance: provenance({ managedAddresses: ['old.bso'] }),
      revision: 2,
      starterAddresses: ['new.bso'],
    });
    const second = replacePreviousStarterSubscriptions({
      subscriptions: first.subscriptions,
      provenance: first.provenance,
      revision: 2,
      starterAddresses: ['new.bso'],
    });

    expect(second).toEqual(first);
  });
});

describe('manual subscription changes', () => {
  it('removes a manually left address from subscriptions and managed provenance', () => {
    expect(
      leaveStarterSubscription({
        subscriptions: ['manual.bso', 'old.bso', 'old.bso'],
        provenance: provenance(),
        address: 'old.bso',
      }),
    ).toEqual({
      subscriptions: ['manual.bso'],
      provenance: {
        schemaVersion: 1,
        acknowledgedRevision: 1,
        knownAddresses: ['old.bso', 'stays.bso'],
        managedAddresses: ['stays.bso'],
      },
    });
  });

  it('keeps a later manual rejoin unmanaged during replacement', () => {
    const left = leaveStarterSubscription({
      subscriptions: ['old.bso'],
      provenance: provenance({ managedAddresses: ['old.bso'] }),
      address: 'old.bso',
    });
    const replaced = replacePreviousStarterSubscriptions({
      subscriptions: [...left.subscriptions, 'old.bso'],
      provenance: left.provenance,
      revision: 2,
      starterAddresses: ['new.bso'],
    });

    expect(replaced.subscriptions).toEqual(['old.bso', 'new.bso']);
    expect(replaced.provenance.managedAddresses).toEqual(['new.bso']);
  });
});

describe('idempotency', () => {
  it('keeps initialize, bootstrap, add-selected, keep-current, and leave stable when repeated', () => {
    const initialized = initializeStarterSubscriptions({ subscriptions: ['manual.bso'], revision: 1, starterAddresses: ['starter.bso'] });
    expect(
      initializeStarterSubscriptions({
        subscriptions: initialized.subscriptions,
        provenance: initialized.provenance,
        revision: 1,
        starterAddresses: ['starter.bso'],
      }),
    ).toEqual(initialized);

    const bootstrapped = bootstrapStarterSubscriptions({ subscriptions: ['manual.bso'], revision: 1, starterAddresses: ['starter.bso'] });
    expect(
      bootstrapStarterSubscriptions({
        subscriptions: bootstrapped.subscriptions,
        provenance: bootstrapped.provenance,
        revision: 1,
        starterAddresses: ['starter.bso'],
      }),
    ).toEqual(bootstrapped);

    const added = addSelectedStarterSubscriptions({
      subscriptions: ['manual.bso'],
      provenance: provenance({ managedAddresses: [] }),
      revision: 2,
      starterAddresses: ['new.bso'],
      selectedAddresses: ['new.bso'],
    });
    expect(
      addSelectedStarterSubscriptions({
        subscriptions: added.subscriptions,
        provenance: added.provenance,
        revision: 2,
        starterAddresses: ['new.bso'],
        selectedAddresses: ['new.bso'],
      }),
    ).toEqual(added);

    const kept = keepCurrentStarterSubscriptions({ subscriptions: ['manual.bso'], provenance: provenance(), revision: 2, starterAddresses: ['new.bso'] });
    expect(
      keepCurrentStarterSubscriptions({
        subscriptions: kept.subscriptions,
        provenance: kept.provenance,
        revision: 2,
        starterAddresses: ['new.bso'],
      }),
    ).toEqual(kept);

    const left = leaveStarterSubscription({ subscriptions: ['old.bso'], provenance: provenance(), address: 'old.bso' });
    expect(leaveStarterSubscription({ subscriptions: left.subscriptions, provenance: left.provenance, address: 'old.bso' })).toEqual(left);
  });
});
