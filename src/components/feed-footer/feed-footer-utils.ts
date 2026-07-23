interface FeedCommunityLoadState {
  updatedAt?: number;
}

interface ShouldShowEmptyFeedOptions {
  requestedCommunityCount: number;
  communities: Array<FeedCommunityLoadState | undefined>;
  feedLength: number;
  isLoadingCommunityData?: boolean;
  isSearching?: boolean;
  searchQuery?: string;
}

export const shouldShowEmptyFeed = ({
  requestedCommunityCount,
  communities,
  feedLength,
  isLoadingCommunityData,
  isSearching,
  searchQuery,
}: ShouldShowEmptyFeedOptions): boolean => {
  // `hasMore` also represents pagination. `updatedAt` is the hook's count-safe
  // evidence that each requested community snapshot loaded.
  const haveAllRequestedCommunitiesLoaded = communities.length === requestedCommunityCount && communities.every((community) => Boolean(community?.updatedAt));

  return haveAllRequestedCommunitiesLoaded && feedLength === 0 && !isLoadingCommunityData && !isSearching && !searchQuery;
};

interface ShouldShowFeedLoadingOptions {
  feedLength: number;
  hasMore: boolean;
  infiniteFeedEnabled: boolean;
}

export const shouldShowFeedLoading = ({ feedLength, hasMore, infiniteFeedEnabled }: ShouldShowFeedLoadingOptions): boolean =>
  feedLength === 0 || (infiniteFeedEnabled && hasMore);
