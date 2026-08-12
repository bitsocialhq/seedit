import { isAllView, isDomainView, isModView } from './view-utils';

interface TimeFilterPathOptions {
  pathname: string;
  sortType: string;
  timeFilterName: string;
  domain?: string;
  search?: string;
}

// builds the route of a feed view with a different time filter, keeping the user in the same view
export const getTimeFilterPath = ({ pathname, sortType, timeFilterName, domain, search = '' }: TimeFilterPathOptions): string => {
  const suffix = `/${sortType}/${timeFilterName}${search}`;

  if (isModView(pathname)) return `/s/mod${suffix}`;
  if (isAllView(pathname)) return `/s/all${suffix}`;
  if (isDomainView(pathname) && domain) return `/domain/${domain}${suffix}`;
  return suffix;
};

const day = 60 * 60 * 24;

// the time filters feed views already preload next to the current feed, from narrowest to widest
const expandableTimeFilters = [
  { name: '1w', seconds: 7 * day },
  { name: '1m', seconds: 30 * day },
  { name: '1y', seconds: 365 * day },
];

interface WiderTimeFilterOptions {
  timeFilterSeconds?: number;
  weeklyFeedLength: number;
  monthlyFeedLength: number;
  yearlyFeedLength: number;
}

// the narrowest preloaded time filter that is wider than the current one and is already known to have posts
export const getWiderTimeFilterWithPosts = ({ timeFilterSeconds, weeklyFeedLength, monthlyFeedLength, yearlyFeedLength }: WiderTimeFilterOptions): string | undefined => {
  // nothing is wider than the 'all' filter, which has no seconds
  if (timeFilterSeconds === undefined) return undefined;

  const feedLengths = [weeklyFeedLength, monthlyFeedLength, yearlyFeedLength];
  return expandableTimeFilters.find(({ seconds }, index) => seconds > timeFilterSeconds && feedLengths[index] > 0)?.name;
};
