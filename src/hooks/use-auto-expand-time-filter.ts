import { useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import useTimeFilter, { getSessionTimeFilterPreference } from './use-time-filter';
import useAutoExpandedTimeFilterStore from '../stores/use-auto-expanded-time-filter-store';
import { getTimeFilterPath, getWiderTimeFilterWithPosts } from '../lib/utils/time-filter-utils';
import { sortTypes } from '../constants/sort-types';

const getFeedKey = (sessionKey: string | null, pathname: string) => sessionKey ?? pathname;

interface AutoExpandTimeFilterOptions {
  // the feed finished loading with no posts, not just still loading
  isFeedEmpty: boolean;
  weeklyFeedLength: number;
  monthlyFeedLength: number;
  yearlyFeedLength: number;
  searchQuery?: string;
}

/**
 * An empty feed is usually a time filter that is too narrow, not a feed without content.
 * When the feed is confirmed empty, redirect to the narrowest wider time filter already known to have posts.
 * A time filter picked from the topbar dropdown is never overridden, and the redirect never repeats on the filter it landed on,
 * so an empty feed can't bounce through every filter.
 *
 * Returns whether the feed is on its way to a wider time filter, so the caller can keep showing the loading state
 * instead of flashing an empty feed that is about to be replaced.
 */
const useAutoExpandTimeFilter = ({ isFeedEmpty, weeklyFeedLength, monthlyFeedLength, yearlyFeedLength, searchQuery }: AutoExpandTimeFilterOptions) => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ sortType?: string; domain?: string }>();
  const { timeFilterName, timeFilterSeconds, sessionKey } = useTimeFilter();

  const feedKey = getFeedKey(sessionKey, location.pathname);
  const autoExpandedFeed = useAutoExpandedTimeFilterStore((state) => state.autoExpandedFeeds[feedKey]);
  const setAutoExpandedFeed = useAutoExpandedTimeFilterStore((state) => state.setAutoExpandedFeed);

  const hasUserPickedTimeFilter = getSessionTimeFilterPreference(sessionKey) === timeFilterName;
  const hasExpandedToCurrentTimeFilter = autoExpandedFeed === timeFilterName;
  const canExpand = isFeedEmpty && !searchQuery && !hasUserPickedTimeFilter && !hasExpandedToCurrentTimeFilter;
  const widerTimeFilterName = canExpand ? getWiderTimeFilterWithPosts({ timeFilterSeconds, weeklyFeedLength, monthlyFeedLength, yearlyFeedLength }) : undefined;

  const sortType = params.sortType && sortTypes.includes(params.sortType) ? params.sortType : sortTypes[0];
  const widerTimeFilterPath =
    widerTimeFilterName &&
    getTimeFilterPath({ pathname: location.pathname, sortType, timeFilterName: widerTimeFilterName, domain: params.domain, search: location.search });

  useEffect(() => {
    if (!widerTimeFilterName || !widerTimeFilterPath) return;
    setAutoExpandedFeed(feedKey, widerTimeFilterName);
    navigate(widerTimeFilterPath, { replace: true });
  }, [widerTimeFilterName, widerTimeFilterPath, feedKey, setAutoExpandedFeed, navigate]);

  // the redirect is pending, or it already happened and the wider feed hasn't rendered its posts yet
  return Boolean(widerTimeFilterName) || (hasExpandedToCurrentTimeFilter && isFeedEmpty);
};

export default useAutoExpandTimeFilter;
