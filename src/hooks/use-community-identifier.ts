import { useMemo } from 'react';
import type { CommunityIdentifier } from '@bitsocial/bitsocial-react-hooks';

const isLikelyCommunityName = (value: string) => value.includes('.');

export const getCommunityIdentifier = (communityAddress: string | undefined): CommunityIdentifier | undefined => {
  if (!communityAddress) {
    return undefined;
  }
  return isLikelyCommunityName(communityAddress) ? { name: communityAddress } : { publicKey: communityAddress };
};

export const getCommunityIdentifiers = (communityAddresses: Array<string | undefined>): CommunityIdentifier[] =>
  communityAddresses.flatMap((communityAddress) => {
    const community = getCommunityIdentifier(communityAddress);
    return community ? [community] : [];
  });

export const useCommunityIdentifier = (communityAddress: string | undefined): CommunityIdentifier | undefined => {
  return useMemo(() => getCommunityIdentifier(communityAddress), [communityAddress]);
};

export const useCommunityIdentifiers = (communityAddresses?: Array<string | undefined>): CommunityIdentifier[] => {
  return useMemo(() => getCommunityIdentifiers(communityAddresses ?? []), [communityAddresses]);
};
