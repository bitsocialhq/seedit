import assert from 'assert';
import { useEffect } from 'react';
import { useLocation, useParams, Params } from 'react-router-dom';
import { isCommunityView, isAllView, isModView, isHomeView, isDomainView } from '../lib/utils/view-utils';
import { getTopTimeFilterPath } from '../lib/utils/time-filter-utils';

// the timestamp the last time the user visited
const lastVisitTimestamp = localStorage.getItem('seeditLastVisitTimestamp');

const VISIT_UPDATE_INTERVAL_MS = 60 * 1000;
let lastVisitIntervalId: ReturnType<typeof setInterval> | null = null;
let lastVisitIntervalUsers = 0;

const startLastVisitInterval = () => {
  if (lastVisitIntervalId) return;
  lastVisitIntervalId = setInterval(() => {
    localStorage.setItem('seeditLastVisitTimestamp', Date.now().toString());
  }, VISIT_UPDATE_INTERVAL_MS);
};

const stopLastVisitIntervalIfUnused = () => {
  if (lastVisitIntervalUsers === 0 && lastVisitIntervalId) {
    clearInterval(lastVisitIntervalId);
    lastVisitIntervalId = null;
  }
};

const timeFilterNamesToSeconds: Record<string, number | undefined> = {
  '1h': 60 * 60,
  '24h': 60 * 60 * 24,
  '1w': 60 * 60 * 24 * 7,
  '1m': 60 * 60 * 24 * 30,
  '1y': 60 * 60 * 24 * 365,
  all: undefined,
};

export const topTimeFilterNames = ['1h', '24h', '1w', '1m', '1y', 'all'];

// calculate the last visit timeFilterNamesToSeconds
const secondsSinceLastVisit = lastVisitTimestamp ? (Date.now() - parseInt(lastVisitTimestamp, 10)) / 1000 : Infinity;
const day = 24 * 60 * 60;
let lastVisitTimeFilterName: string | undefined;
if (!lastVisitTimestamp) {
  // a first visit has nothing to catch up on, so it starts on the freshest feed;
  // when nothing was posted that recently the feed expands itself to a window that has posts
  lastVisitTimeFilterName = '24h';
  timeFilterNamesToSeconds[lastVisitTimeFilterName] = timeFilterNamesToSeconds['24h'];
} else if (secondsSinceLastVisit > 30 * day) {
  lastVisitTimeFilterName = '1m';
  timeFilterNamesToSeconds[lastVisitTimeFilterName] = timeFilterNamesToSeconds['1m'];
} else if (secondsSinceLastVisit > 7 * day) {
  const weeks = Math.ceil(secondsSinceLastVisit / day / 7);
  lastVisitTimeFilterName = `${weeks}w`;
  timeFilterNamesToSeconds[lastVisitTimeFilterName] = 60 * 60 * 24 * 7 * weeks;
} else if (secondsSinceLastVisit > day) {
  const days = Math.ceil(secondsSinceLastVisit / day);
  lastVisitTimeFilterName = `${days}d`;
  timeFilterNamesToSeconds[lastVisitTimeFilterName] = 60 * 60 * 24 * days;
} else {
  lastVisitTimeFilterName = '24h';
  timeFilterNamesToSeconds[lastVisitTimeFilterName] = timeFilterNamesToSeconds['24h'];
}

function convertTimeStringToSeconds(timeString: string): number {
  const match = timeString.match(/^(\d+)([hdwmy])$/);
  if (!match) {
    throw new Error(`Invalid time filter format: ${timeString}`);
  }

  const [, value, unit] = match;
  const numValue = parseInt(value, 10);

  switch (unit) {
    case 'h':
      return numValue * 60 * 60;
    case 'd':
      return numValue * 24 * 60 * 60;
    case 'w':
      return numValue * 7 * 24 * 60 * 60;
    case 'm':
      return numValue * 30 * 24 * 60 * 60;
    case 'y':
      return numValue * 365 * 24 * 60 * 60;
    default:
      throw new Error(`Invalid time unit: ${unit}`);
  }
}

const getSessionKeyForView = (pathname: string, params: Readonly<Params<string>>): string | null => {
  if (isHomeView(pathname)) return 'sessionTimeFilter-home';
  if (isAllView(pathname)) return 'sessionTimeFilter-all';
  if (isModView(pathname)) return 'sessionTimeFilter-mod';
  if (isDomainView(pathname)) return `sessionTimeFilter-domain-${params.domain}`;
  if (isCommunityView(pathname, params)) return `sessionTimeFilter-community-${params.communityAddress}`;
  return null;
};

export const getSessionTimeFilterPreference = (sessionKey: string | null): string | null => {
  if (!sessionKey) return null;
  try {
    return sessionStorage.getItem(sessionKey);
  } catch (e) {
    console.error('Could not read from sessionStorage:', e);
    return null;
  }
};

export const setSessionTimeFilterPreference = (sessionKey: string | null, timeFilterName: string): void => {
  if (!sessionKey) return;
  try {
    sessionStorage.setItem(sessionKey, timeFilterName);
  } catch (e) {
    console.error('Could not write to sessionStorage:', e);
  }
};

export const isValidTimeFilterName = (name: string | undefined | null): boolean => {
  if (!name) {
    return true;
  }
  if (name === 'all') {
    return true;
  }
  const predefinedStaticKeys = ['1h', '24h', '1w', '1m', '1y'];
  if (predefinedStaticKeys.includes(name)) {
    return true;
  }
  const match = name.match(/^(\d+)([hdwmy])$/);
  if (match) {
    const numValue = parseInt(match[1], 10);
    return numValue > 0;
  }
  return false;
};

export const isValidTopTimeFilterName = (name: string | undefined | null): boolean => !name || topTimeFilterNames.includes(name);

const useTimeFilter = () => {
  const params = useParams();
  const location = useLocation();
  const isTopSort = params.sortType === 'top' || params.sortType === 'topAll';
  const sessionKey = getSessionKeyForView(location.pathname, params);

  useEffect(() => {
    lastVisitIntervalUsers += 1;
    startLastVisitInterval();

    return () => {
      lastVisitIntervalUsers -= 1;
      stopLastVisitIntervalIfUnused();
    };
  }, []);

  const storedTimeFilterName = getSessionTimeFilterPreference(sessionKey);
  const storedTopTimeFilterName = storedTimeFilterName && topTimeFilterNames.includes(storedTimeFilterName) ? storedTimeFilterName : undefined;
  const effectiveTimeFilterName = isTopSort ? params.timeFilterName || storedTopTimeFilterName || 'all' : lastVisitTimeFilterName;
  const searchQuery = new URLSearchParams(location.search).get('q') || '';
  const preferredTopTimeFilterPath =
    isTopSort && !params.timeFilterName && !searchQuery && storedTopTimeFilterName
      ? getTopTimeFilterPath(location.pathname, params.timeFilterName, storedTopTimeFilterName, location.search)
      : null;

  let timeFilterSeconds: number | undefined;

  if (effectiveTimeFilterName === 'all') {
    timeFilterSeconds = undefined;
  } else if (effectiveTimeFilterName && effectiveTimeFilterName in timeFilterNamesToSeconds) {
    timeFilterSeconds = timeFilterNamesToSeconds[effectiveTimeFilterName as keyof typeof timeFilterNamesToSeconds];
  } else if (effectiveTimeFilterName) {
    try {
      timeFilterSeconds = convertTimeStringToSeconds(effectiveTimeFilterName);
    } catch {
      console.error(`Invalid time filter format: ${effectiveTimeFilterName}`);
      timeFilterSeconds = undefined;
    }
  }

  if (timeFilterSeconds === undefined && effectiveTimeFilterName !== 'all') {
    timeFilterSeconds = timeFilterNamesToSeconds['24h'];
  }

  assert(effectiveTimeFilterName === 'all' || timeFilterSeconds !== undefined, `useTimeFilter no filter for timeFilterName '${effectiveTimeFilterName}'`);

  return { timeFilterSeconds, timeFilterName: effectiveTimeFilterName, lastVisitTimeFilterName, sessionKey, preferredTopTimeFilterPath };
};

export default useTimeFilter;
