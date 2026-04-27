import { useEffect, useMemo, useState } from 'react';
import { Community } from '@bitsocial/bitsocial-react-hooks';
import useContentOptionsStore from '../stores/use-content-options-store';

export interface DefaultSubscriptionsMetadata {
  title: string;
  description: string;
  createdAt: number;
  updatedAt: number;
}

export interface DefaultSubscription {
  title?: string;
  address: string;
  tags?: string[];
  features?: string[];
  seeditAutoSubscribe?: boolean;
  plebchanAutoSubscribe?: boolean;
  lowUptime?: boolean;
}

let cacheSubscriptions: DefaultSubscription[] | null = null;
let cacheMetadata: DefaultSubscriptionsMetadata | null = null;
let cacheAutoSubscribeAddresses: string[] | null = null;
let pending = false;

// Subscriber pattern for notifying all hook instances
const subscribers = new Set<() => void>();

const notifySubscribers = () => {
  subscribers.forEach((callback) => callback());
};

// Shared fetch function to avoid duplication
const fetchDefaultSubscriptionsData = async () => {
  if (pending) {
    return;
  }
  pending = true;

  try {
    const res = await fetch('https://raw.githubusercontent.com/bitsocialnet/lists/master/seedit-default-subscriptions.json');

    if (!res.ok) {
      cacheSubscriptions = [];
      cacheAutoSubscribeAddresses = [];
      cacheMetadata = null;
      notifySubscribers();
      return;
    }

    const multisub = await res.json();

    const filteredSubscriptions = multisub.subplebbits.filter((sub: DefaultSubscription) => !sub.lowUptime);

    cacheSubscriptions = filteredSubscriptions;

    // Cache auto-subscribe addresses when we fetch subscriptions
    cacheAutoSubscribeAddresses = filteredSubscriptions
      .filter((sub: DefaultSubscription) => sub.seeditAutoSubscribe && sub.address)
      .map((sub: DefaultSubscription) => sub.address);

    // Also cache metadata since we have the full response
    const { title, description, createdAt, updatedAt } = multisub;
    cacheMetadata = { title, description, createdAt, updatedAt };

    // Notify all subscribers that cache has been updated
    notifySubscribers();

    return { subscriptions: filteredSubscriptions, metadata: cacheMetadata };
  } catch (e) {
    console.warn(e);
    return null;
  } finally {
    pending = false;
  }
};

export const useDefaultSubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState<DefaultSubscription[]>(cacheSubscriptions || []);

  useEffect(() => {
    // If we already have cached data, use it immediately
    if (cacheSubscriptions) {
      setSubscriptions(cacheSubscriptions);
      return;
    }

    // Subscribe to cache updates
    const handleCacheUpdate = () => {
      if (cacheSubscriptions) {
        setSubscriptions(cacheSubscriptions);
      }
    };

    subscribers.add(handleCacheUpdate);

    // Trigger fetch if no cache and not pending
    if (!pending) {
      fetchDefaultSubscriptionsData();
    }

    // Cleanup subscription
    return () => {
      subscribers.delete(handleCacheUpdate);
    };
  }, []);

  return subscriptions;
};

export const getAutoSubscribeAddresses = () => cacheAutoSubscribeAddresses || [];

export const useDefaultSubscriptionAddresses = () => {
  const defaultSubscriptions = useDefaultSubscriptions();
  const { hideAdultCommunities, hideGoreCommunities, hideAntiCommunities, hideVulgarCommunities } = useContentOptionsStore();

  const filteredSubscriptions = useMemo(() => {
    return defaultSubscriptions.filter((subscription: Community) => {
      const tags = subscription.tags || [];
      if (hideAdultCommunities && tags.includes('adult')) return false;
      if (hideGoreCommunities && tags.includes('gore')) return false;
      if (hideAntiCommunities && tags.includes('anti')) return false;
      if (hideVulgarCommunities && tags.includes('vulgar')) return false;
      return true;
    });
  }, [defaultSubscriptions, hideAdultCommunities, hideGoreCommunities, hideAntiCommunities, hideVulgarCommunities]);

  return useMemo(() => filteredSubscriptions.map((subscription) => subscription.address), [filteredSubscriptions]);
};

export const useDefaultSubscriptionsMetadata = () => {
  const [metadata, setMetadata] = useState<DefaultSubscriptionsMetadata | null>(cacheMetadata || null);

  useEffect(() => {
    // If we already have cached data, use it immediately
    if (cacheMetadata) {
      setMetadata(cacheMetadata);
      return;
    }

    // Subscribe to cache updates
    const handleCacheUpdate = () => {
      if (cacheMetadata) {
        setMetadata(cacheMetadata);
      }
    };

    subscribers.add(handleCacheUpdate);

    // Trigger fetch if no cache and not pending
    if (!pending) {
      fetchDefaultSubscriptionsData();
    }

    // Cleanup subscription
    return () => {
      subscribers.delete(handleCacheUpdate);
    };
  }, []);

  return metadata;
};

const getUniqueTags = (multisub: any) => {
  const allTags = new Set<string>();
  Object.values(multisub).forEach((sub: any) => {
    if (sub?.tags?.length) {
      sub.tags.forEach((tag: string) => allTags.add(tag));
    }
  });
  return Array.from(allTags).sort();
};

export const useDefaultSubscriptionTags = (subscriptions: any) => {
  return useMemo(() => getUniqueTags(subscriptions), [subscriptions]);
};
