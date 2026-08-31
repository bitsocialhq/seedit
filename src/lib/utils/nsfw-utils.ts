// The protocol's community-level NSFW truth is the editable community setting
// `community.features.safeForWork`. Seedit's curated lists carry an `nsfw` flag used as the
// fallback for communities that have not been resolved yet.
//
// This module is the only place either signal is read, and the only place the `safeForWork`
// polarity is inverted into `nsfw`. Everything downstream is in `nsfw` polarity.

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/**
 * Three-state NSFW for a community: `true`, `false`, or `undefined` when nothing declared it.
 * A live `features.safeForWork` boolean wins; the curated list entry is the fallback when no live
 * community is available. Only a real boolean declares either setting, so `'true'`, `null` and `0`
 * all mean undeclared. Consumers decide what `undefined` means.
 */
export const deriveCommunityNsfw = (community?: unknown, listEntry?: { nsfw?: boolean }): boolean | undefined => {
  const features = isRecord(community) ? community.features : undefined;
  const safeForWork = isRecord(features) ? features.safeForWork : undefined;
  if (typeof safeForWork === 'boolean') return !safeForWork;

  return typeof listEntry?.nsfw === 'boolean' ? listEntry.nsfw : undefined;
};
