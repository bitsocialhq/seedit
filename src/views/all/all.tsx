import { useEffect, useRef, useState, useMemo } from 'react';
import { Navigate, useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Virtuoso, VirtuosoHandle, StateSnapshot } from 'react-virtuoso';
import { commentMatchesPattern } from '../../lib/utils/pattern-utils';
import useFeedFiltersStore from '../../stores/use-feed-filters-store';
import { useDefaultSubscriptionAddresses } from '../../hooks/use-default-subscriptions';
import useTimeFilter, { isValidTimeFilterName, isValidTopTimeFilterName, topTimeFilterNames } from '../../hooks/use-time-filter';
import { FEED_POSTS_PER_PAGE, useInfiniteFeedEnabled } from '../../hooks/use-feed-pagination';
import FeedFooter from '../../components/feed-footer';
import DevelopmentFeedResetButton from '../../components/development-feed-reset-button/development-feed-reset-button-lazy';
import TopTimeFilter from '../../components/top-time-filter';
import { getCommunityIdentifiers } from '../../hooks/use-community-identifier';
import LoadingEllipsis from '../../components/loading-ellipsis';
import Post from '../../components/post';
import Sidebar from '../../components/sidebar';
import { getCanonicalTopPath, getFeedSortType, getRouteSortType, isLegacyTopRoute, isValidRouteSortType } from '../../constants/sort-types';
import useProgressiveFeed from '../../hooks/use-progressive-feed';
import { getPathWithoutTimeFilter } from '../../lib/utils/time-filter-utils';
import styles from '../home/home.module.css';

const lastVirtuosoStates: { [key: string]: StateSnapshot } = {};

const All = () => {
  const communityAddresses = useDefaultSubscriptionAddresses();
  const params = useParams<{ sortType?: string; timeFilterName?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';
  const navigate = useNavigate();
  const location = useLocation();

  const sortType = getRouteSortType(params.sortType);
  const feedSortType = getFeedSortType(sortType);

  const { timeFilterName, timeFilterSeconds, sessionKey } = useTimeFilter();

  useEffect(() => {
    if (sortType === 'top' && !params.timeFilterName && !searchQuery && sessionKey) {
      const sessionPreference = sessionStorage.getItem(sessionKey);
      if (sessionPreference && topTimeFilterNames.includes(sessionPreference)) {
        const targetPath = `/s/all/${sortType}/${sessionPreference}${location.search}`;
        navigate(targetPath, { replace: true });
      }
    }
  }, [params.timeFilterName, searchQuery, sessionKey, sortType, navigate, location.search, location.pathname]);

  useEffect(() => {
    const hasInvalidTimeFilter = sortType === 'top' ? !isValidTopTimeFilterName(params.timeFilterName) : !isValidTimeFilterName(params.timeFilterName);
    if (!isValidRouteSortType(params.sortType) || hasInvalidTimeFilter) {
      navigate('/not-found', { replace: true });
    }
  }, [params?.sortType, params.timeFilterName, sortType, navigate]);

  const currentTimeFilterName = params.timeFilterName || timeFilterName || (sortType === 'top' ? 'all' : '24h');

  const { isSearching } = useFeedFiltersStore();
  const infiniteFeedEnabled = useInfiniteFeedEnabled();
  const [showNoResults, setShowNoResults] = useState(false);
  const [searchAttemptCompleted, setSearchAttemptCompleted] = useState(false);

  const feedOptions = useMemo(() => {
    const options: any = {
      newerThan: searchQuery ? 0 : timeFilterSeconds,
      postsPerPage: FEED_POSTS_PER_PAGE,
      sortType: feedSortType,
      communities: getCommunityIdentifiers(communityAddresses),
    };

    if (searchQuery) {
      options.filter = {
        filter: (comment: Comment) => {
          if (!searchQuery.trim()) return true;
          return commentMatchesPattern(comment, searchQuery);
        },
        key: `search-filter-${searchQuery}`,
      };
    }

    return options;
  }, [communityAddresses, feedSortType, timeFilterSeconds, searchQuery]);

  const { feed, hasMore, loadMore, reset } = useProgressiveFeed({ enabled: sortType !== 'top' && !searchQuery, feedOptions });

  // Reset no results state when search query changes
  useEffect(() => {
    setShowNoResults(false);
    setSearchAttemptCompleted(false);
  }, [searchQuery]);

  // Determine if search attempt is complete
  useEffect(() => {
    if (searchQuery && !isSearching && !searchAttemptCompleted) {
      setSearchAttemptCompleted(true);
    }
  }, [searchQuery, isSearching, searchAttemptCompleted]);

  // Logic to show "No results" message after a delay
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (searchQuery && feed?.length === 0 && searchAttemptCompleted) {
      timer = setTimeout(() => {
        setShowNoResults(true);
      }, 1500);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [searchQuery, feed?.length, searchAttemptCompleted]);

  const { t } = useTranslation();

  const documentTitle = 'seedit: ' + t('all_communities');
  useEffect(() => {
    document.title = documentTitle;
  }, [documentTitle]);

  const virtuosoRef = useRef<VirtuosoHandle | null>(null);

  useEffect(() => {
    const setLastVirtuosoState = () => {
      virtuosoRef.current?.getState((snapshot: StateSnapshot) => {
        if (snapshot?.ranges?.length) {
          lastVirtuosoStates[sortType + currentTimeFilterName + 'all' + searchQuery] = snapshot;
        }
      });
    };
    window.addEventListener('scroll', setLastVirtuosoState);
    return () => window.removeEventListener('scroll', setLastVirtuosoState);
  }, [sortType, currentTimeFilterName, searchQuery]);

  const lastVirtuosoState = lastVirtuosoStates?.[sortType + currentTimeFilterName + 'all' + searchQuery];

  const footerProps = {
    feedLength: feed?.length ?? 0,
    hasFeedLoaded: !!feed,
    hasMore,
    communityAddresses,
    searchQuery: searchQuery,
    isSearching,
    showNoResults,
    onLoadMore: loadMore,
  };

  const handleClearSearch = () => {
    setSearchParams((prev) => {
      prev.delete('q');
      return prev;
    });
    reset();
  };

  if (isLegacyTopRoute(params.sortType)) {
    return <Navigate to={getCanonicalTopPath(location.pathname, location.search)} replace />;
  }

  if (sortType !== 'top' && params.timeFilterName) {
    return <Navigate to={getPathWithoutTimeFilter(location.pathname, params.timeFilterName, location.search)} replace />;
  }

  return (
    <div>
      <div className={styles.content}>
        <div className={`${styles.sidebar}`}>
          <Sidebar />
        </div>
        {isSearching ? (
          <div className={styles.feed}>
            <div className={styles.footer}>
              <div className={styles.stateString}>
                <LoadingEllipsis string={t('searching')} />
              </div>
            </div>
          </div>
        ) : showNoResults && searchQuery ? (
          <div className={styles.feed}>
            <div className={styles.footer}>
              <div className={styles.stateString}>
                <span className={styles.noMatchesFound}>{t('no_matches_found_for', { query: searchQuery })}</span>
                <br />
                <br />
                <div className={styles.morePostsSuggestion}>
                  <span className={styles.link} onClick={handleClearSearch}>
                    {t('clear_search')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.feed}>
            <DevelopmentFeedResetButton onReset={reset} />
            {sortType === 'top' && !searchQuery && <TopTimeFilter selectedTimeFilterName={currentTimeFilterName} sessionKey={sessionKey} />}
            <Virtuoso
              increaseViewportBy={{ bottom: 1200, top: 600 }}
              totalCount={feed?.length || 0}
              data={feed}
              computeItemKey={(index, post) => post?.cid || index}
              itemContent={(index, post) => <Post key={post?.cid} index={index} post={post} />}
              useWindowScroll={true}
              components={{ Footer: () => <FeedFooter {...footerProps} /> }}
              endReached={infiniteFeedEnabled ? loadMore : undefined}
              ref={virtuosoRef}
              restoreStateFrom={lastVirtuosoState}
              initialScrollTop={lastVirtuosoState?.scrollTop}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default All;
