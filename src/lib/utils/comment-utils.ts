// Helper to safely extract the community address from a Comment object.
export const getCommentCommunityAddress = (comment?: unknown): string | undefined => {
  if (!comment || typeof comment !== 'object') {
    return undefined;
  }

  const record = comment as { communityAddress?: unknown };

  if (typeof record.communityAddress === 'string' && record.communityAddress) {
    return record.communityAddress;
  }

  return undefined;
};
