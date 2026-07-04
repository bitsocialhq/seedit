import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useDirectoryWinners } from './use-directory-winners';
import { isDirectoryCode } from '../lib/utils/directory-codes';

const NO_CODES: string[] = [];

interface ResolvedCommunityAddress {
  /** The community address to load: the directory winner for codes, the identifier itself otherwise. */
  communityAddress: string | undefined;
  /** Whether the route identifier is a directory code (e.g. /s/memes). */
  isDirectory: boolean;
  /** True while a directory code has no candidate list at all yet. */
  isResolving: boolean;
}

/**
 * Resolve the /s/:communityAddress route param (or an override) to a loadable community
 * address. Directory codes resolve at read time to the highest-ranked online candidate;
 * plain addresses pass through unchanged. Never rewrites the stored subscription.
 */
export const useResolvedCommunityAddress = (identifierOverride?: string): ResolvedCommunityAddress => {
  const params = useParams<{ communityAddress?: string }>();
  const identifier = identifierOverride ?? params.communityAddress;
  const isDirectory = isDirectoryCode(identifier);
  const directoryCodes = useMemo(() => (isDirectory && identifier ? [identifier] : NO_CODES), [isDirectory, identifier]);
  const { winnerAddressByCode, isResolving } = useDirectoryWinners(directoryCodes);

  return useMemo(() => {
    if (!identifier) {
      return { communityAddress: undefined, isDirectory: false, isResolving: false };
    }
    if (!isDirectory) {
      return { communityAddress: identifier, isDirectory: false, isResolving: false };
    }
    return { communityAddress: winnerAddressByCode[identifier], isDirectory: true, isResolving };
  }, [identifier, isDirectory, winnerAddressByCode, isResolving]);
};
