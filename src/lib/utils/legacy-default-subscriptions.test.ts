import { describe, expect, it } from 'vitest';
import starterCommunities from '../../data/seedit-starter-communities.json';
import {
  LEGACY_DEFAULT_SUBSCRIPTIONS,
  LEGACY_DIRECTORY_ADDRESS_BY_CODE,
  STARTER_COMMUNITIES_REVISION,
  STARTER_COMMUNITIES_SCHEMA_VERSION,
  STARTER_COMMUNITY_ADDRESSES,
  computeAddressCanonicalSubscriptionMigration,
  computeDirectoryMigration,
} from './legacy-default-subscriptions';

describe('seedit starter community snapshot', () => {
  it('contains the versioned metadata and all fixed migration targets', () => {
    expect(starterCommunities.schemaVersion).toBe(STARTER_COMMUNITIES_SCHEMA_VERSION);
    expect(starterCommunities.revision).toBe(STARTER_COMMUNITIES_REVISION);
    expect(starterCommunities.createdAt).toBe(1745707200);
    expect(starterCommunities.updatedAt).toBe(1784049342);
    expect(starterCommunities.communities).toHaveLength(10);
    expect(starterCommunities.communities.map(({ address }) => address)).toEqual(STARTER_COMMUNITY_ADDRESSES);
    expect(new Set(starterCommunities.communities.map(({ publicKey }) => publicKey))).toHaveLength(10);
  });
});

describe('computeAddressCanonicalSubscriptionMigration', () => {
  it('maps only the directory codes actually present and preserves manual-address order', () => {
    const result = computeAddressCanonicalSubscriptionMigration(['first.bso', 'memes', 'middle.eth', 'aww', 'last.sol']);

    expect(result.next).toEqual(['first.bso', 'memes-posting.bso', 'middle.eth', 'aww-posting.bso', 'last.sol']);
    expect(result.replacedDirectoryCodes).toEqual([
      { code: 'memes', address: 'memes-posting.bso', sourceIndex: 1 },
      { code: 'aww', address: 'aww-posting.bso', sourceIndex: 3 },
    ]);
    expect(result.addedStarterAddresses).toEqual([]);
    expect(result.changed).toBe(true);
  });

  it('does not add missing starter addresses to a partial directory-code subscription set', () => {
    const result = computeAddressCanonicalSubscriptionMigration(['news']);

    expect(result.next).toEqual(['news-posting.bso']);
    expect(result.added).toEqual(['news-posting.bso']);
    expect(result.next).not.toContain(LEGACY_DIRECTORY_ADDRESS_BY_CODE.memes);
    expect(result.provenance).toEqual([{ address: 'news-posting.bso', source: 'directory-code', sourceValue: 'news' }]);
  });

  it('deduplicates a mapped code against an existing direct subscription', () => {
    const result = computeAddressCanonicalSubscriptionMigration(['memes-posting.bso', 'memes', 'manual.bso']);

    expect(result.next).toEqual(['memes-posting.bso', 'manual.bso']);
    expect(result.deduplicatedAddresses).toEqual(['memes-posting.bso']);
    expect(result.added).toEqual([]);
    expect(result.provenance).not.toContainEqual({ address: 'memes-posting.bso', source: 'directory-code', sourceValue: 'memes' });
  });

  it('uses the first canonical occurrence when a code precedes its direct address', () => {
    const result = computeAddressCanonicalSubscriptionMigration(['manual-before.bso', 'memes', 'memes-posting.bso', 'manual-after.bso']);

    expect(result.next).toEqual(['manual-before.bso', 'memes-posting.bso', 'manual-after.bso']);
    expect(result.deduplicatedAddresses).toEqual(['memes-posting.bso']);
  });

  it('records provenance once when duplicate directory codes collapse to one address', () => {
    const result = computeAddressCanonicalSubscriptionMigration(['memes', 'memes']);

    expect(result.next).toEqual(['memes-posting.bso']);
    expect(result.replacedDirectoryCodes).toHaveLength(2);
    expect(result.deduplicatedAddresses).toEqual(['memes-posting.bso']);
    expect(result.provenance).toEqual([{ address: 'memes-posting.bso', source: 'directory-code', sourceValue: 'memes' }]);
  });

  it('migrates a full legacy default cohort to every starter address', () => {
    const result = computeAddressCanonicalSubscriptionMigration([...LEGACY_DEFAULT_SUBSCRIPTIONS]);

    expect(result.next).toEqual(STARTER_COMMUNITY_ADDRESSES);
    expect(result.removedLegacyDefaults).toEqual([...LEGACY_DEFAULT_SUBSCRIPTIONS]);
    expect(result.addedStarterAddresses).toEqual(STARTER_COMMUNITY_ADDRESSES);
    expect(result.provenance.filter(({ source }) => source === 'legacy-default-cohort')).toHaveLength(10);
  });

  it('preserves unrelated addresses while replacing a legacy cohort with the starter set', () => {
    const result = computeAddressCanonicalSubscriptionMigration(['manual-before.bso', 'plebtoken.eth', 'manual-after.sol', '💩posting.eth']);

    expect(result.next).toEqual(['manual-before.bso', 'manual-after.sol', ...STARTER_COMMUNITY_ADDRESSES]);
    expect(result.removed).toEqual(['plebtoken.eth', '💩posting.eth']);
  });

  it('does not duplicate a starter address already kept from the account', () => {
    const result = computeAddressCanonicalSubscriptionMigration(['aww-posting.bso', 'plebtoken.eth']);

    expect(result.next[0]).toBe('aww-posting.bso');
    expect(result.next.filter((address) => address === 'aww-posting.bso')).toHaveLength(1);
    expect(result.addedStarterAddresses).not.toContain('aww-posting.bso');
    expect(result.next).toHaveLength(STARTER_COMMUNITY_ADDRESSES.length);
  });

  it('leaves an address-only account unchanged', () => {
    const subscriptions = ['my-community.bso', 'another.eth', '12D3KooWQmV9xN1wJ5rL8hP7dZ6cB4sT2yF3gK9aE1uR'];
    const result = computeAddressCanonicalSubscriptionMigration(subscriptions);

    expect(result.next).toEqual(subscriptions);
    expect(result.changed).toBe(false);
    expect(result.replacedDirectoryCodes).toEqual([]);
    expect(result.provenance).toEqual([]);
  });

  it('leaves empty and missing subscription arrays unchanged', () => {
    expect(computeAddressCanonicalSubscriptionMigration([])).toMatchObject({ next: [], changed: false, added: [], removed: [] });
    expect(computeAddressCanonicalSubscriptionMigration(undefined)).toMatchObject({ next: [], changed: false, added: [], removed: [] });
  });

  it('does not touch addresses that only resemble retired defaults or codes', () => {
    const subscriptions = ['plebtoken.eth.mycopy', 'notplebtoken.eth', 'memes.bso', 'MEMES'];
    const result = computeAddressCanonicalSubscriptionMigration(subscriptions);

    expect(result.next).toEqual(subscriptions);
    expect(result.changed).toBe(false);
  });

  it('is idempotent and keeps the compatibility export equivalent', () => {
    const first = computeAddressCanonicalSubscriptionMigration(['plebtoken.eth', 'my-community.bso', 'memes']);
    const second = computeAddressCanonicalSubscriptionMigration(first.next);

    expect(second).toMatchObject({ next: first.next, changed: false, added: [], removed: [], provenance: [] });
    expect(computeDirectoryMigration(first.next)).toEqual(second);
  });
});
