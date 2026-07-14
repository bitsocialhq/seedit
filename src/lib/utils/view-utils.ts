export type ParamsType = {
  accountCommentIndex?: string;
  authorAddress?: string;
  commentCid?: string;
  communityAddress?: string;
  timeFilterName?: string;
};

export type ViewType = 'home' | 'pending' | 'post' | 'submit' | 'community' | 'community/submit';

const sortTypes = ['/hot', '/new', '/active', '/topAll'];

export const getAboutLink = (pathname: string, params: ParamsType): string => {
  // some communities might use emojis in their address, so we need to decode the pathname
  const decodedPathname = decodeURIComponent(pathname);

  if (decodedPathname.startsWith(`/s/${params.communityAddress}/comments/${params.commentCid}`)) {
    return `/s/${params.communityAddress}/comments/${params.commentCid}/about`;
  } else if (decodedPathname.startsWith(`/s/${params.communityAddress}`)) {
    return `/s/${params.communityAddress}/about`;
  } else if (decodedPathname.startsWith('/profile')) {
    return '/profile/about';
  } else if (decodedPathname.startsWith('/u/')) {
    return `/u/${params.authorAddress}/comments/${params.commentCid}/about`;
  } else if (decodedPathname.startsWith('/s/all')) {
    return '/s/all/about';
  } else {
    return '/about';
  }
};

export const isAllView = (pathname: string): boolean => {
  return pathname === '/s/all' || pathname.startsWith('/s/all/');
};

export const isAllAboutView = (pathname: string): boolean => {
  return pathname === '/s/all/about';
};

export const isAuthorView = (pathname: string): boolean => {
  return pathname.startsWith('/u/');
};

export const isAuthorCommentsView = (pathname: string, params: ParamsType): boolean => {
  return pathname === `/u/${params.authorAddress}/comments/${params.commentCid}/comments`;
};

export const isAuthorSubmittedView = (pathname: string, params: ParamsType): boolean => {
  return pathname === `/u/${params.authorAddress}/comments/${params.commentCid}/submitted`;
};

export const isCreateCommunityView = (pathname: string): boolean => {
  return pathname === '/communities/create';
};

export const isDomainView = (pathname: string): boolean => {
  return pathname.startsWith('/domain/');
};

export const isHomeView = (pathname: string): boolean => {
  if (pathname === '/') return true;

  const pathParts = pathname.split('/');
  if (pathParts.length >= 2) {
    const potentialSortType = '/' + pathParts[1];
    return sortTypes.includes(potentialSortType);
  }

  return false;
};

export const isHomeAboutView = (pathname: string): boolean => {
  return pathname === '/about' || pathname.startsWith('/about#');
};

export const isInboxView = (pathname: string): boolean => {
  return pathname.startsWith('/inbox');
};

export const isInboxCommentRepliesView = (pathname: string): boolean => {
  return pathname === `/inbox/commentreplies`;
};

export const isInboxPostRepliesView = (pathname: string): boolean => {
  return pathname === `/inbox/postreplies`;
};

export const isInboxUnreadView = (pathname: string): boolean => {
  return pathname === `/inbox/unread`;
};

export const isModView = (pathname: string): boolean => {
  return pathname === `/s/mod` || pathname.startsWith(`/s/mod/`);
};

export const isPendingPostView = (pathname: string, params: ParamsType): boolean => {
  return pathname === `/profile/${params.accountCommentIndex}`;
};

export const isPostPageView = (pathname: string, params: ParamsType): boolean => {
  // some communities might use emojis in their address, so we need to decode the pathname
  const decodedPathname = decodeURIComponent(pathname);
  return params.communityAddress && params.commentCid ? decodedPathname.startsWith(`/s/${params.communityAddress}/comments/${params.commentCid}`) : false;
};

export const isPostPageAboutView = (pathname: string, params: ParamsType): boolean => {
  return params.communityAddress && params.commentCid ? pathname.startsWith(`/s/${params.communityAddress}/comments/${params.commentCid}/about`) : false;
};

export const isPostContextView = (pathname: string, params: ParamsType, search: string): boolean => {
  if (!params.communityAddress || !params.commentCid) return false;

  const decodedPathname = decodeURIComponent(pathname);
  const expectedPathBase = `/s/${params.communityAddress}/comments/${params.commentCid}`;

  if (!decodedPathname.startsWith(expectedPathBase)) return false;

  const searchParams = new URLSearchParams(search);
  const context = searchParams.get('context');

  return context !== null && !isNaN(Number(context));
};

export const isProfileView = (pathname: string): boolean => {
  return pathname.startsWith(`/profile`);
};

export const isProfileCommentsView = (pathname: string): boolean => {
  return pathname.startsWith('/profile/comments');
};

export const isProfileSubmittedView = (pathname: string): boolean => {
  return pathname.startsWith('/profile/submitted');
};

export const isProfileDownvotedView = (pathname: string): boolean => {
  return pathname === '/profile/downvoted';
};

export const isProfileUpvotedView = (pathname: string): boolean => {
  return pathname === '/profile/upvoted';
};

export const isProfileHiddenView = (pathname: string): boolean => {
  return pathname === '/profile/hidden';
};

export const isSettingsView = (pathname: string): boolean => {
  return (
    pathname === '/settings' ||
    pathname === '/settings/advanced' ||
    pathname === '/settings/p2p-stats' ||
    pathname === '/settings/content-options' ||
    pathname === '/settings/account-data'
  );
};

export const isSettingsAdvancedView = (pathname: string): boolean => {
  return pathname === '/settings/advanced';
};

export const isSettingsP2pStatsView = (pathname: string): boolean => {
  return pathname === '/settings/p2p-stats';
};

export const isSettingsContentOptionsView = (pathname: string): boolean => {
  return pathname === '/settings/content-options';
};

export const isSettingsAccountDataView = (pathname: string): boolean => {
  return pathname === '/settings/account-data';
};

export const isSubmitView = (pathname: string): boolean => {
  return pathname.endsWith('/submit');
};

export const isCommunityView = (pathname: string, params: ParamsType): boolean => {
  // some communities might use emojis in their address, so we need to decode the pathname
  const decodedPathname = decodeURIComponent(pathname);
  return params.communityAddress ? decodedPathname.startsWith(`/s/${params.communityAddress}`) : false;
};

export const isCommunityAboutView = (pathname: string, params: ParamsType): boolean => {
  return params.communityAddress ? pathname.startsWith(`/s/${params.communityAddress}/about`) : false;
};

export const isCommunitySettingsView = (pathname: string, params: ParamsType): boolean => {
  return params.communityAddress ? pathname === `/s/${params.communityAddress}/settings` || pathname === `/s/${params.communityAddress}/settings/editor` : false;
};

export const isCommunitySubmitView = (pathname: string, params: ParamsType): boolean => {
  return params.communityAddress ? pathname === `/s/${params.communityAddress}/submit` : false;
};

export const isCommunitiesView = (pathname: string): boolean => {
  return pathname.startsWith('/communities');
};

export const isCommunitiesSubscriberView = (pathname: string): boolean => {
  return pathname === '/communities/subscriber';
};

export const isCommunitiesModeratorView = (pathname: string): boolean => {
  return pathname === '/communities/moderator';
};

export const isCommunitiesAdminView = (pathname: string): boolean => {
  return pathname === '/communities/admin';
};

export const isCommunitiesOwnerView = (pathname: string): boolean => {
  return pathname === '/communities/owner';
};

export const isCommunitiesVoteView = (pathname: string): boolean => {
  return pathname.startsWith('/communities/vote');
};

export const isCommunitiesVotePassingView = (pathname: string): boolean => {
  return pathname === '/communities/vote/passing';
};

export const isCommunitiesVoteRejectingView = (pathname: string): boolean => {
  return pathname === '/communities/vote/rejecting';
};
