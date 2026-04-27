// Helper to safely extract the community address from a Comment object.
// The protocol may return the address as either the legacy `subplebbitAddress`
// field or the new `communityAddress` field. Reading both ensures compatibility
// with old and new protocol data at runtime.
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
