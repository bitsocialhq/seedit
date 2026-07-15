export type SubscriptionState = 'loading' | 'noSubscriptions' | 'hasSubscriptions';

interface HomeSubscriptionStateInput {
  hasSearchQuery: boolean;
  subscriptionCount: number;
  feedLength: number | undefined;
  isCheckingSubscriptions: boolean;
  safeToShowNoSubscriptions: boolean;
}

export const getHomeSubscriptionState = ({
  hasSearchQuery,
  subscriptionCount,
  feedLength,
  isCheckingSubscriptions,
  safeToShowNoSubscriptions,
}: HomeSubscriptionStateInput): SubscriptionState => {
  if (hasSearchQuery || subscriptionCount > 0 || (feedLength !== undefined && feedLength > 0)) return 'hasSubscriptions';
  if (!isCheckingSubscriptions && feedLength === 0 && safeToShowNoSubscriptions) return 'noSubscriptions';
  return 'loading';
};
