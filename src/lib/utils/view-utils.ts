export type ParamsType = {
  accountCommentIndex?: string;
  authorAddress?: string;
  commentCid?: string;
  subplebbitAddress?: string;
  timeFilterName?: string;
};

export type ViewType = 'home' | 'pending' | 'post' | 'submit' | 'subplebbit' | 'subplebbit/submit';

const sortTypes = ['/hot', '/new', '/active', '/topAll'];

export const getAboutLink = (pathname: string, params: ParamsType): string => {
  // some subs might use emojis in their address, so we need to decode the pathname
  const decodedPathname = decodeURIComponent(pathname);

  if (decodedPathname.startsWith(`/s/${params.subplebbitAddress}/c/${params.commentCid}`)) {
    return `/s/${params.subplebbitAddress}/c/${params.commentCid}/about`;
  } else if (decodedPathname.startsWith(`/s/${params.subplebbitAddress}`)) {
    return `/s/${params.subplebbitAddress}/about`;
  } else if (decodedPathname.startsWith('/profile')) {
    return '/profile/about';
  } else if (decodedPathname.startsWith('/u/')) {
    return `/u/${params.authorAddress}/c/${params.commentCid}/about`;
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
  return pathname === `/u/${params.authorAddress}/c/${params.commentCid}/comments`;
};

export const isAuthorSubmittedView = (pathname: string, params: ParamsType): boolean => {
  return pathname === `/u/${params.authorAddress}/c/${params.commentCid}/submitted`;
};

export const isCreateSubplebbitView = (pathname: string): boolean => {
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
  // some subs might use emojis in their address, so we need to decode the pathname
  const decodedPathname = decodeURIComponent(pathname);
  return params.subplebbitAddress && params.commentCid ? decodedPathname.startsWith(`/s/${params.subplebbitAddress}/c/${params.commentCid}`) : false;
};

export const isPostPageAboutView = (pathname: string, params: ParamsType): boolean => {
  return params.subplebbitAddress && params.commentCid ? pathname.startsWith(`/s/${params.subplebbitAddress}/c/${params.commentCid}/about`) : false;
};

export const isPostContextView = (pathname: string, params: ParamsType, search: string): boolean => {
  if (!params.subplebbitAddress || !params.commentCid) return false;

  const decodedPathname = decodeURIComponent(pathname);
  const expectedPathBase = `/s/${params.subplebbitAddress}/c/${params.commentCid}`;

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
  return pathname === '/settings' || pathname === '/settings/plebbit-options' || pathname === '/settings/content-options' || pathname === '/settings/account-data';
};

export const isSettingsPlebbitOptionsView = (pathname: string): boolean => {
  return pathname === '/settings/plebbit-options';
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

export const isSubplebbitView = (pathname: string, params: ParamsType): boolean => {
  // some subs might use emojis in their address, so we need to decode the pathname
  const decodedPathname = decodeURIComponent(pathname);
  return params.subplebbitAddress ? decodedPathname.startsWith(`/s/${params.subplebbitAddress}`) : false;
};

export const isSubplebbitAboutView = (pathname: string, params: ParamsType): boolean => {
  return params.subplebbitAddress ? pathname.startsWith(`/s/${params.subplebbitAddress}/about`) : false;
};

export const isSubplebbitSettingsView = (pathname: string, params: ParamsType): boolean => {
  return params.subplebbitAddress ? pathname === `/s/${params.subplebbitAddress}/settings` || pathname === `/s/${params.subplebbitAddress}/settings/editor` : false;
};

export const isSubplebbitSubmitView = (pathname: string, params: ParamsType): boolean => {
  return params.subplebbitAddress ? pathname === `/s/${params.subplebbitAddress}/submit` : false;
};

export const isSubplebbitsView = (pathname: string): boolean => {
  return pathname.startsWith('/communities');
};

export const isSubplebbitsSubscriberView = (pathname: string): boolean => {
  return pathname === '/communities/subscriber';
};

export const isSubplebbitsModeratorView = (pathname: string): boolean => {
  return pathname === '/communities/moderator';
};

export const isSubplebbitsAdminView = (pathname: string): boolean => {
  return pathname === '/communities/admin';
};

export const isSubplebbitsOwnerView = (pathname: string): boolean => {
  return pathname === '/communities/owner';
};

export const isSubplebbitsVoteView = (pathname: string): boolean => {
  return pathname.startsWith('/communities/vote');
};

export const isSubplebbitsVotePassingView = (pathname: string): boolean => {
  return pathname === '/communities/vote/passing';
};

export const isSubplebbitsVoteRejectingView = (pathname: string): boolean => {
  return pathname === '/communities/vote/rejecting';
};
