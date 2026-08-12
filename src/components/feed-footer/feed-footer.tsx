import { useState, useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { useCommunities } from '@bitsocial/bitsocial-react-hooks';
import { isModView } from '../../lib/utils/view-utils';
import { getTimeFilterPath } from '../../lib/utils/time-filter-utils';
import { useCommunityIdentifiers } from '../../hooks/use-community-identifier';
import { useFeedStateString } from '../../hooks/use-state-string';
import EmptyFeedMessage from '../empty-feed-message/empty-feed-message';
import useAutoExpandTimeFilter from '../../hooks/use-auto-expand-time-filter';
import { useInfiniteFeedEnabled } from '../../hooks/use-feed-pagination';
import FeedPagination from './feed-pagination';
import LoadingEllipsis from '../loading-ellipsis';
import { shouldShowEmptyFeed, shouldShowFeedLoading } from './feed-footer-utils';
import styles from './feed-footer.module.css';
import React from 'react';

interface FeedFooterProps {
  feedLength: number;
  hasFeedLoaded: boolean;
  hasMore: boolean;
  communityAddresses: string[];
  communityAddressesWithNewerPosts: string[];
  weeklyFeedLength: number;
  monthlyFeedLength: number;
  yearlyFeedLength: number;
  currentTimeFilterName: string;
  reset: () => void;
  searchQuery?: string;
  isSearching?: boolean;
  showNoResults?: boolean;
  onClearSearch?: () => void;
  onLoadMore: () => void;
}

const FeedFooter = ({
  feedLength,
  hasFeedLoaded,
  hasMore,
  communityAddresses,
  weeklyFeedLength,
  monthlyFeedLength,
  yearlyFeedLength,
  currentTimeFilterName,
  searchQuery,
  isSearching,
  showNoResults,
  onClearSearch,
  onLoadMore,
}: FeedFooterProps) => {
  let footerContent;
  const { t } = useTranslation();
  const params = useParams();
  const location = useLocation();
  const isInModView = isModView(location.pathname);
  const infiniteFeedEnabled = useInfiniteFeedEnabled();
  const getWiderFeedPath = (timeFilterName: string) =>
    getTimeFilterPath({ pathname: location.pathname, sortType: params?.sortType || 'hot', timeFilterName, domain: params?.domain });

  const feedCommunityIdentifiers = useCommunityIdentifiers(communityAddresses);
  const { communities } = useCommunities({ communities: feedCommunityIdentifiers });
  const feedStateString = useFeedStateString(communityAddresses);
  const loadingStateString =
    feedStateString ||
    (!hasFeedLoaded || (feedLength === 0 && !(weeklyFeedLength > feedLength || monthlyFeedLength > feedLength || yearlyFeedLength > feedLength))
      ? t('loading_feed')
      : t('looking_for_more_posts'));
  const hasEmptyFeedData = shouldShowEmptyFeed({
    requestedCommunityCount: feedCommunityIdentifiers.length,
    communities,
    feedLength,
    isLoadingCommunityData: Boolean(feedStateString),
    isSearching,
    searchQuery,
  });

  const widerFeedSuggestion =
    weeklyFeedLength > feedLength && !searchQuery ? (
      <div className={styles.morePostsSuggestion}>
        <Trans
          i18nKey='more_posts_last_week'
          values={{ currentTimeFilterName, count: feedLength }}
          components={{
            1: <Link key='weekly-posts-link' to={getWiderFeedPath('1w')} />,
          }}
        />
      </div>
    ) : monthlyFeedLength > feedLength && !searchQuery ? (
      <div className={styles.morePostsSuggestion}>
        <Trans
          i18nKey='more_posts_last_month'
          values={{ currentTimeFilterName, count: feedLength }}
          components={{
            1: <Link key='monthly-posts-link' to={getWiderFeedPath('1m')} />,
          }}
        />
      </div>
    ) : yearlyFeedLength > feedLength && !searchQuery ? (
      <div className={styles.morePostsSuggestion}>
        <Trans
          i18nKey='more_posts_last_year'
          values={{ currentTimeFilterName, count: feedLength }}
          components={{
            1: <Link key='yearly-posts-link' to={getWiderFeedPath('1y')} />,
          }}
        />
      </div>
    ) : null;

  // Add state to track initial loading
  const [hasFetchedCommunityAddresses, setHasFetchedCommunityAddresses] = useState(false);

  // Set hasInitialized after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasFetchedCommunityAddresses(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const showEmptyFeed = hasFetchedCommunityAddresses && hasEmptyFeedData;

  const isAutoExpandingFeed = useAutoExpandTimeFilter({ isFeedEmpty: showEmptyFeed, weeklyFeedLength, monthlyFeedLength, yearlyFeedLength, searchQuery });

  if (!hasFetchedCommunityAddresses) {
    footerContent = <LoadingEllipsis string={t('loading_feed')} />;
  }

  // Handle search state
  if (isSearching) {
    footerContent = (
      <div className={styles.stateString}>
        <LoadingEllipsis string={t('searching')} />
      </div>
    );
  } else if (showNoResults && searchQuery) {
    footerContent = (
      <div className={styles.stateString}>
        <span className={styles.noMatchesFound}>{t('no_matches_found_for', { query: searchQuery })}</span>
        <br />
        <br />
        <div className={styles.morePostsSuggestion}>
          <span className={styles.link} onClick={onClearSearch}>
            {t('clear_search')}
          </span>
        </div>
      </div>
    );
  } else if (searchQuery && feedLength > 0) {
    // When search results are found
    footerContent = (
      <div className={styles.stateString}>
        <span className={styles.searchResults}>{t('found_n_results_for', { count: feedLength, query: searchQuery })}</span>
        <br />
        <br />
        <div className={styles.morePostsSuggestion}>
          <span className={styles.link} onClick={onClearSearch}>
            {t('clear_search')}
          </span>
        </div>
      </div>
    );
  } else if (showEmptyFeed && !isAutoExpandingFeed) {
    footerContent = (
      <>
        {widerFeedSuggestion}
        <EmptyFeedMessage />
      </>
    );
  } else if (hasMore || communityAddresses.length > 0 || (communityAddresses && communityAddresses.length === 0)) {
    // Only show newer posts/weekly/monthly suggestions when not searching
    footerContent = (
      <>
        {/* a feed with no posts yet is either still loading or about to expand on its own, so a wider time filter
            can only be suggested once the feed is settled, otherwise the suggestion flashes and disappears */}
        {feedLength === 0 ? null : widerFeedSuggestion}
        <div className={styles.stateString}>
          {communityAddresses.length === 0 ? (
            isInModView ? (
              <div className={styles.notModerator}>{t('not_moderator')}</div>
            ) : (
              <div>
                <Trans
                  i18nKey='no_communities_found'
                  components={[
                    <a key='community-lists-link' href='https://github.com/bitsocialhq/lists'>
                      https://github.com/bitsocialhq/lists
                    </a>,
                  ]}
                />
                <br />
                {t('connect_community_notice')}
              </div>
            )
          ) : !searchQuery ? (
            shouldShowFeedLoading({ feedLength, hasMore, infiniteFeedEnabled }) ? (
              <LoadingEllipsis string={feedStateString || loadingStateString} />
            ) : null
          ) : null}
        </div>
      </>
    );
  }
  return (
    <div className={styles.footer}>
      {footerContent}
      <FeedPagination feedLength={feedLength} hasMore={hasMore} onLoadMore={onLoadMore} />
    </div>
  );
};

export default React.memo(FeedFooter);
