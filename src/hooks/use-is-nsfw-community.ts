import { useMemo } from 'react';
import { useCommunity } from '@bitsocial/bitsocial-react-hooks';
import { isResolvableCommunityAddress } from '../lib/utils/community-route-utils';
import { deriveCommunityNsfw } from '../lib/utils/nsfw-utils';
import { getCommunityIdentifier } from './use-community-identifier';
import { useDefaultSubscriptions } from './use-default-subscriptions';

/**
 * Whether this community is NSFW. The protocol setting `community.features.safeForWork` decides it
 * once the community is cached; curated default-community metadata is the fallback until then.
 * An undeclared community collapses to SFW here.
 */
export const useIsNsfwCommunity = (communityAddress: string) => {
  const defaultCommunities = useDefaultSubscriptions();
  const community = useCommunity(
    isResolvableCommunityAddress(communityAddress) ? { community: getCommunityIdentifier(communityAddress), onlyIfCached: true } : undefined,
  );
  const features = community?.features;

  return useMemo(() => {
    if (!communityAddress || !defaultCommunities) return false;

    const listEntry = defaultCommunities.find((sub) => sub.address === communityAddress);

    return deriveCommunityNsfw({ features }, listEntry) === true;
  }, [communityAddress, defaultCommunities, features]);
};
