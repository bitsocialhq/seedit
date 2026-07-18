// Helper to safely extract the community address from current and legacy Comment objects.
export const getCommentCommunityAddress = (comment?: unknown): string | undefined => {
  if (!comment || typeof comment !== 'object') {
    return undefined;
  }

  const record = comment as { communityAddress?: unknown; subplebbitAddress?: unknown };

  if (typeof record.communityAddress === 'string' && record.communityAddress) {
    return record.communityAddress;
  }

  if (typeof record.subplebbitAddress === 'string' && record.subplebbitAddress) {
    return record.subplebbitAddress;
  }

  return undefined;
};
