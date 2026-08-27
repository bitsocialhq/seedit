import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CommunityIdentifier, UseFeedOptions, UseFeedResult } from '@bitsocial/bitsocial-react-hooks';
import { FEED_POSTS_PER_PAGE } from './use-feed-pagination';
import useFeedWithCompatibleSort from './use-feed-with-compatible-sort';
import useSuggestionFeedLoader from './use-suggestion-feed-loader';
import {
  getAutomaticProgressiveTimeWindow,
  getManualProgressiveTimeWindow,
  getWiderProgressiveTimeWindows,
  progressiveTimeWindows,
  type ProgressiveTimeWindow,
  type ProgressiveTimeWindowProbe,
} from '../lib/utils/progressive-time-filter-utils';

interface UseProgressiveFeedOptions {
  enabled: boolean;
  feedOptions: UseFeedOptions;
}

const getCommunityKey = ({ name, publicKey }: CommunityIdentifier) => `${name}:${publicKey || ''}`;

const getProgressiveFeedKey = (options: UseFeedOptions): string =>
  [
    options.accountName || '',
    options.sortType || '',
    options.postsPerPage || '',
    options.filter?.key || '',
    options.newerThan ?? 'all',
    [...(options.communities || [])].map(getCommunityKey).sort().join(','),
  ].join('|');

const useProgressiveFeed = ({ enabled, feedOptions }: UseProgressiveFeedOptions): UseFeedResult => {
  const lastAutomaticExpansionRef = useRef<{ feedKey: string; feedLength: number; hasMore: boolean; state: string } | undefined>(undefined);
  const feedKey = useMemo(() => getProgressiveFeedKey(feedOptions), [feedOptions]);
  const [activeWindow, setActiveWindow] = useState<{ feedKey: string; newerThan?: number }>({ feedKey, newerThan: feedOptions.newerThan });
  const currentNewerThan = activeWindow.feedKey === feedKey ? activeWindow.newerThan : feedOptions.newerThan;
  const baseFeed = useFeedWithCompatibleSort(feedOptions);
  const shouldProbe = enabled && currentNewerThan !== undefined && baseFeed.state !== 'fetching-ipns' && !baseFeed.hasMore;
  const widerWindows = useMemo(() => getWiderProgressiveTimeWindows(currentNewerThan), [currentNewerThan]);
  const shouldProbeWindow = (name: ProgressiveTimeWindow['name']) => shouldProbe && widerWindows.some((window) => window.name === name);
  const suggestionTargetLength = Math.max(FEED_POSTS_PER_PAGE, baseFeed.feed.length + 1);

  const getSuggestionOptions = (window: ProgressiveTimeWindow): UseFeedOptions => ({
    ...feedOptions,
    communities: shouldProbeWindow(window.name) ? feedOptions.communities : [],
    newerThan: window.newerThan,
  });

  const weeklyFeed = useFeedWithCompatibleSort(getSuggestionOptions(progressiveTimeWindows[0]));
  const monthlyFeed = useFeedWithCompatibleSort(getSuggestionOptions(progressiveTimeWindows[1]));
  const yearlyFeed = useFeedWithCompatibleSort(getSuggestionOptions(progressiveTimeWindows[2]));
  const allTimeFeed = useFeedWithCompatibleSort(getSuggestionOptions(progressiveTimeWindows[3]));

  useSuggestionFeedLoader({
    feedLength: weeklyFeed.feed.length,
    hasMore: weeklyFeed.hasMore,
    loadMore: weeklyFeed.loadMore,
    requestKey: `${feedKey}:1w`,
    shouldLoad: shouldProbeWindow('1w'),
    targetFeedLength: suggestionTargetLength,
  });
  useSuggestionFeedLoader({
    feedLength: monthlyFeed.feed.length,
    hasMore: monthlyFeed.hasMore,
    loadMore: monthlyFeed.loadMore,
    requestKey: `${feedKey}:1m`,
    shouldLoad: shouldProbeWindow('1m'),
    targetFeedLength: suggestionTargetLength,
  });
  useSuggestionFeedLoader({
    feedLength: yearlyFeed.feed.length,
    hasMore: yearlyFeed.hasMore,
    loadMore: yearlyFeed.loadMore,
    requestKey: `${feedKey}:1y`,
    shouldLoad: shouldProbeWindow('1y'),
    targetFeedLength: suggestionTargetLength,
  });
  useSuggestionFeedLoader({
    feedLength: allTimeFeed.feed.length,
    hasMore: allTimeFeed.hasMore,
    loadMore: allTimeFeed.loadMore,
    requestKey: `${feedKey}:all`,
    shouldLoad: shouldProbeWindow('all'),
    targetFeedLength: suggestionTargetLength,
  });

  const probes = useMemo<ProgressiveTimeWindowProbe[]>(
    () =>
      [weeklyFeed, monthlyFeed, yearlyFeed, allTimeFeed].map((feed, index) => ({
        ...progressiveTimeWindows[index],
        feedLength: feed.feed.length,
        settled: feed.state !== 'fetching-ipns' && !feed.hasMore,
      })),
    [
      allTimeFeed.feed.length,
      allTimeFeed.hasMore,
      allTimeFeed.state,
      monthlyFeed.feed.length,
      monthlyFeed.hasMore,
      monthlyFeed.state,
      weeklyFeed.feed.length,
      weeklyFeed.hasMore,
      weeklyFeed.state,
      yearlyFeed.feed.length,
      yearlyFeed.hasMore,
      yearlyFeed.state,
    ],
  );

  const expandToWindow = useCallback(
    async (window: ProgressiveTimeWindow) => {
      setActiveWindow({ feedKey, newerThan: window.newerThan });
      await baseFeed.expandTimeWindow(window.newerThan);
    },
    [baseFeed.expandTimeWindow, feedKey],
  );

  const automaticWindow = shouldProbe ? getAutomaticProgressiveTimeWindow(currentNewerThan, baseFeed.feed.length, FEED_POSTS_PER_PAGE, probes) : undefined;
  const automaticWindowName = automaticWindow?.name;
  const automaticWindowNewerThan = automaticWindow?.newerThan;

  useEffect(() => {
    if (!automaticWindowName) return;
    const lastExpansion = lastAutomaticExpansionRef.current;
    if (
      lastExpansion?.feedKey === feedKey &&
      lastExpansion.feedLength === baseFeed.feed.length &&
      lastExpansion.hasMore === baseFeed.hasMore &&
      lastExpansion.state === baseFeed.state
    ) {
      return;
    }
    lastAutomaticExpansionRef.current = { feedKey, feedLength: baseFeed.feed.length, hasMore: baseFeed.hasMore, state: baseFeed.state };
    void expandToWindow({ name: automaticWindowName, newerThan: automaticWindowNewerThan });
  }, [automaticWindowName, automaticWindowNewerThan, baseFeed.feed.length, baseFeed.hasMore, baseFeed.state, expandToWindow, feedKey]);

  const loadMore = useCallback(async () => {
    if (baseFeed.hasMore) {
      await baseFeed.loadMore();
      return;
    }

    const nextWindow = enabled ? getManualProgressiveTimeWindow(currentNewerThan, baseFeed.feed.length, probes) : undefined;
    if (nextWindow) await expandToWindow(nextWindow);
  }, [baseFeed.feed.length, baseFeed.hasMore, baseFeed.loadMore, currentNewerThan, enabled, expandToWindow, probes]);

  return {
    ...baseFeed,
    hasMore: baseFeed.hasMore || (enabled && currentNewerThan !== undefined),
    loadMore,
  };
};

export default useProgressiveFeed;
