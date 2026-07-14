import { useMemo } from 'react';
import { useDefaultSubscriptions } from './use-default-subscriptions';

/**
 * Whether default-community metadata marks this community `nsfw: true`.
 * Communities without default metadata return false.
 */
export const useIsNsfwCommunity = (communityAddress: string) => {
  const defaultCommunities = useDefaultSubscriptions();

  return useMemo(() => {
    if (!communityAddress || !defaultCommunities) return false;

    const community = defaultCommunities.find((sub) => sub.address === communityAddress);

    return Boolean(community?.nsfw);
  }, [communityAddress, defaultCommunities]);
};
