const DEFAULT_COMMUNITY_TLD = '.bso';
const RESERVED_COMMUNITY_ROUTE_SEGMENTS = new Set(['all', 'mod']);
const BASE58_PUBLIC_KEY_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{30,}$/;

const isReservedCommunityRouteSegment = (segment: string): boolean => RESERVED_COMMUNITY_ROUTE_SEGMENTS.has(segment.toLowerCase());

const isLikelyBase58PublicKey = (value: string): boolean => BASE58_PUBLIC_KEY_PATTERN.test(value);

export const isResolvableCommunityAddress = (address: string | undefined): address is string =>
  Boolean(address && (address.includes('.') || isLikelyBase58PublicKey(address)));

/**
 * Expands Seedit's default-TLD route shorthand into the full community address
 * used by data hooks and account state.
 */
export const resolveCommunityRouteAddress = (segment: string | undefined): string | undefined => {
  if (!segment || segment.includes('.') || isReservedCommunityRouteSegment(segment) || isLikelyBase58PublicKey(segment)) {
    return segment;
  }

  return `${segment}${DEFAULT_COMMUNITY_TLD}`;
};

/**
 * Returns the shortest deterministic route segment for a community address.
 * Only single-label .bso names can be shortened without becoming ambiguous.
 */
export const getCommunityRouteSegment = (address: string): string => {
  if (!address.toLowerCase().endsWith(DEFAULT_COMMUNITY_TLD)) {
    return address;
  }

  const label = address.slice(0, -DEFAULT_COMMUNITY_TLD.length);
  if (!label || label.includes('.') || isReservedCommunityRouteSegment(label) || isLikelyBase58PublicKey(label)) {
    return address;
  }

  return label;
};

export const getCommunityPath = (communityAddress: string): string => `/s/${encodeURIComponent(getCommunityRouteSegment(communityAddress))}`;

export const getCommunityPostPath = (communityAddress: string, cid: string): string => `${getCommunityPath(communityAddress)}/comments/${encodeURIComponent(cid)}`;

export const getCommunityPostUrl = (communityAddress: string, cid: string): string => `https://seedit.app${getCommunityPostPath(communityAddress, cid)}`;

export const getCanonicalCommunityPostRedirectPath = (
  routeCommunitySegment: string | undefined,
  postCommunityAddress: string | undefined,
  cid: string | undefined,
): string | undefined => {
  const routeCommunityAddress = resolveCommunityRouteAddress(routeCommunitySegment);
  const resolvedPostCommunityAddress = resolveCommunityRouteAddress(postCommunityAddress);
  if (!cid || !resolvedPostCommunityAddress || routeCommunityAddress === resolvedPostCommunityAddress) return undefined;
  return getCommunityPostPath(resolvedPostCommunityAddress, cid);
};
