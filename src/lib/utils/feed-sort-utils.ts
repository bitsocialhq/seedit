import type { Comment, Community, CommunityIdentifier } from '@bitsocial/bitsocial-react-hooks';
import feedSorter from '@bitsocial/bitsocial-react-hooks/dist/stores/feeds/feed-sorter.js';

const clientSortablePostSorts = new Set(['hot', 'new', 'active', 'topAll']);

interface FeedCommunityGroups {
  requestedSortCommunities: CommunityIdentifier[];
  preloadedSortCommunities: CommunityIdentifier[];
}

const getAvailablePostSortTypes = (community: Community): string[] => [
  ...new Set([...Object.keys(community.posts?.pages || {}), ...Object.keys(community.posts?.pageCids || {})]),
];

const nonBlockingPostSortMetadataStates = new Set(['failed', 'stopped', 'succeeded', 'waiting-retry']);

export const hasUnresolvedPostSortMetadata = (communities: Array<Community | undefined>, requestedSortType?: string): boolean => {
  if (!requestedSortType) return false;
  const resolvedCommunities = communities.filter((community): community is Community => Boolean(community));
  if (resolvedCommunities.some((community) => getAvailablePostSortTypes(community).length > 0)) return false;
  return resolvedCommunities.some((community) => !nonBlockingPostSortMetadataStates.has(community.updatingState || ''));
};

const hasCompletePreloadedPostPage = (community: Community): boolean => {
  const preloadedSorts = Object.keys(community.posts?.pages || {});
  const paginatedSorts = Object.keys(community.posts?.pageCids || {});
  return preloadedSorts.length === 1 && paginatedSorts.length === 0;
};

export const getFeedCommunityGroups = (
  communityIdentifiers: CommunityIdentifier[],
  communities: Array<Community | undefined>,
  requestedSortType?: string,
): FeedCommunityGroups => {
  const requestedSortCommunities: CommunityIdentifier[] = [];
  const preloadedSortCommunities: CommunityIdentifier[] = [];

  communities.forEach((community, index) => {
    const communityIdentifier = communityIdentifiers[index];
    if (!community || !communityIdentifier) return;

    if (!requestedSortType || getAvailablePostSortTypes(community).includes(requestedSortType)) {
      requestedSortCommunities.push(communityIdentifier);
    } else if (clientSortablePostSorts.has(requestedSortType) && hasCompletePreloadedPostPage(community)) {
      preloadedSortCommunities.push(communityIdentifier);
    }
  });

  return { requestedSortCommunities, preloadedSortCommunities };
};

export const mergeAndSortFeeds = (requestedSortFeed: Comment[], preloadedSortFeed: Comment[], requestedSortType?: string): Comment[] => {
  const postsByCid = new Map<string, Comment>();
  for (const post of [...requestedSortFeed, ...preloadedSortFeed]) {
    postsByCid.set(post.cid, post);
  }
  return feedSorter.sort(requestedSortType, [...postsByCid.values()]);
};
