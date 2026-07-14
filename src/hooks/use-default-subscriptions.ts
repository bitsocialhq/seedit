import { useMemo, useSyncExternalStore } from 'react';
import useContentOptionsStore from '../stores/use-content-options-store';
import vendoredStarterCommunities from '../data/seedit-starter-communities.json';

const STARTER_COMMUNITIES_URL = 'https://raw.githubusercontent.com/bitsocialnet/lists/master/seedit-default-subscriptions.json';
const REVALIDATE_INTERVAL_MS = 60 * 60 * 1000;

export interface DefaultSubscription {
  title?: string;
  description?: string;
  address: string;
  publicKey?: string;
  nsfw?: boolean;
  tags?: string[];
}

export interface StarterCommunityList {
  schemaVersion: 1;
  revision: number;
  title: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  communities: DefaultSubscription[];
}

interface StarterCommunityListSnapshot {
  list: StarterCommunityList;
  loading: boolean;
  error: Error | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const normalizeStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const values = [...new Set(value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0))];
  return values.length > 0 ? values : undefined;
};

const normalizeCommunity = (value: unknown): DefaultSubscription | null => {
  if (!isRecord(value) || typeof value.address !== 'string' || value.address.length === 0) return null;
  const tags = normalizeStringArray(value.tags);

  return {
    address: value.address,
    ...(typeof value.title === 'string' && value.title ? { title: value.title } : {}),
    ...(typeof value.description === 'string' && value.description ? { description: value.description } : {}),
    ...(typeof value.publicKey === 'string' && value.publicKey ? { publicKey: value.publicKey } : {}),
    ...(typeof value.nsfw === 'boolean' ? { nsfw: value.nsfw } : {}),
    ...(tags ? { tags } : {}),
  };
};

export const normalizeStarterCommunityList = (value: unknown): StarterCommunityList | null => {
  if (!isRecord(value) || value.schemaVersion !== 1 || !Number.isInteger(value.revision) || (value.revision as number) < 1) return null;
  const rawCommunities = Array.isArray(value.communities) ? value.communities : null;
  if (!rawCommunities) return null;

  const communities = rawCommunities.map(normalizeCommunity).filter((community): community is DefaultSubscription => community !== null);
  const uniqueCommunities = communities.filter((community, index) => communities.findIndex(({ address }) => address === community.address) === index);
  if (uniqueCommunities.length === 0) return null;

  return {
    schemaVersion: 1,
    revision: value.revision as number,
    title: typeof value.title === 'string' ? value.title : 'Seedit Default Communities',
    description: typeof value.description === 'string' ? value.description : '',
    createdAt: typeof value.createdAt === 'number' ? value.createdAt : 0,
    updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : 0,
    communities: uniqueCommunities,
  };
};

const hasSameCommunityAddresses = (first: StarterCommunityList, second: StarterCommunityList): boolean => {
  if (first.communities.length !== second.communities.length) return false;
  const firstAddresses = new Set(first.communities.map(({ address }) => address));
  return second.communities.every(({ address }) => firstAddresses.has(address));
};

export const normalizeRemoteStarterCommunityList = (value: unknown, currentList: StarterCommunityList): StarterCommunityList | null => {
  const remoteList = normalizeStarterCommunityList(value);
  if (!remoteList) throw new Error('Invalid default communities response');
  if (remoteList.revision < currentList.revision) return null;
  if (remoteList.revision === currentList.revision && !hasSameCommunityAddresses(remoteList, currentList)) {
    throw new Error('Default community membership changed without a new revision');
  }
  return remoteList;
};

const vendoredList = normalizeStarterCommunityList(vendoredStarterCommunities);
if (!vendoredList) {
  throw new Error('Invalid vendored Seedit default communities list');
}

let snapshot: StarterCommunityListSnapshot = { list: vendoredList, loading: true, error: null };
let lastFetchAt = 0;
let inFlightFetch: Promise<void> | null = null;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

const fetchStarterCommunities = () => {
  if (inFlightFetch || Date.now() - lastFetchAt < REVALIDATE_INTERVAL_MS) return inFlightFetch;

  snapshot = { ...snapshot, loading: true, error: null };
  emit();
  lastFetchAt = Date.now();

  inFlightFetch = fetch(STARTER_COMMUNITIES_URL, { cache: 'no-cache' })
    .then(async (response) => {
      if (!response.ok) throw new Error(`Default communities request failed with ${response.status}`);
      const remoteList = normalizeRemoteStarterCommunityList(await response.json(), snapshot.list);
      if (remoteList) {
        snapshot = { list: remoteList, loading: false, error: null };
      } else {
        snapshot = { ...snapshot, loading: false, error: null };
      }
    })
    .catch((error) => {
      snapshot = { ...snapshot, loading: false, error: error instanceof Error ? error : new Error(String(error)) };
    })
    .finally(() => {
      inFlightFetch = null;
      emit();
    });

  return inFlightFetch;
};

const handleVisibilityChange = () => {
  if (typeof document !== 'undefined' && document.visibilityState === 'visible') void fetchStarterCommunities();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  if (listeners.size === 1 && typeof document !== 'undefined') document.addEventListener('visibilitychange', handleVisibilityChange);
  void fetchStarterCommunities();

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof document !== 'undefined') document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
};

const getSnapshot = () => snapshot;

export const useStarterCommunityList = (): StarterCommunityListSnapshot => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

export const useDefaultSubscriptions = (): DefaultSubscription[] => useStarterCommunityList().list.communities;

export const useFilteredDefaultSubscriptions = (): DefaultSubscription[] => {
  const defaultSubscriptions = useDefaultSubscriptions();
  const { hideNsfwCommunities } = useContentOptionsStore();

  return useMemo(
    () => (hideNsfwCommunities ? defaultSubscriptions.filter((subscription) => !subscription.nsfw) : defaultSubscriptions),
    [defaultSubscriptions, hideNsfwCommunities],
  );
};

export const useDefaultSubscriptionAddresses = (): string[] => {
  const subscriptions = useFilteredDefaultSubscriptions();
  return subscriptions.map(({ address }) => address);
};

export const useDefaultSubscriptionsMetadata = () => {
  const { list } = useStarterCommunityList();
  return useMemo(() => ({ title: list.title, description: list.description, createdAt: list.createdAt, updatedAt: list.updatedAt, revision: list.revision }), [list]);
};

export const useDefaultSubscriptionTags = (subscriptions: DefaultSubscription[]) => [...new Set(subscriptions.flatMap(({ tags }) => tags ?? []))].sort();
