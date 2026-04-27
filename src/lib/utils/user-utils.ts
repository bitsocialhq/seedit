import { Role, Community, Comment } from '@bitsocial/bitsocial-react-hooks';

export type Roles = { [address: string]: Role };

export const isUserOwner = (roles: Roles | undefined, userAddress: string | undefined): boolean => {
  if (!roles || !userAddress) return false;
  return roles[userAddress]?.role === 'owner';
};

export const isUserOwnerOrAdmin = (roles: Roles | undefined, userAddress: string | undefined): boolean => {
  if (!roles || !userAddress) return false;
  const userRole = roles[userAddress]?.role;
  return userRole === 'owner' || userRole === 'admin';
};

export const findCommunityCreator = (roles: Roles | undefined): string => {
  if (!roles) {
    return 'anonymous';
  }

  const owner = Object.keys(roles).find((key) => roles[key].role === 'owner');
  if (owner) {
    return owner;
  }

  return 'anonymous';
};

export const findAuthorCommunities = (authorAddress: string | undefined, communities: (Community | undefined)[]): string[] => {
  let authorCommunities: string[] = [];

  if (!authorAddress || !communities) {
    return [];
  }

  communities.forEach((community) => {
    if (community && community.roles?.[authorAddress]) {
      authorCommunities.push(community.address);
    }
  });

  return authorCommunities;
};

interface Score {
  postScore: number;
  replyScore: number;
}

export const estimateAuthorKarma = (accountComments: (Comment | undefined)[]): Score => {
  let postScore = 0;
  let replyScore = 0;

  accountComments.forEach((comment) => {
    if (comment) {
      // Ensure upvoteCount and downvoteCount are treated as numbers, defaulting to 0 if null or undefined
      const upvotes = comment.upvoteCount ?? 0;
      const downvotes = comment.downvoteCount ?? 0;
      const score = upvotes - downvotes;

      if (comment.parentCid) {
        replyScore += score;
      } else {
        postScore += score;
      }
    }
  });

  return { postScore, replyScore };
};
