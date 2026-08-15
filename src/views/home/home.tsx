import { useEffect, useRef, useState, useMemo, useCallback, startTransition } from 'react';
import { Link, useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { Virtuoso, VirtuosoHandle, StateSnapshot } from 'react-virtuoso';
import { useAccount, useFeed, Comment } from '@bitsocial/bitsocial-react-hooks';
import { Trans, useTranslation } from 'react-i18next';
import { commentMatchesPattern } from '../../lib/utils/pattern-utils';
import useFeedFiltersStore from '../../stores/use-feed-filters-store';
import { useAutoSubscribeStore } from '../../stores/use-auto-subscribe-store';
import useTimeFilter, { isValidTimeFilterName } from '../../hooks/use-time-filter';
import useRedirectToDefaultSort from '../../hooks/use-redirect-to-default-sort';
import { FEED_POSTS_PER_PAGE, useInfiniteFeedEnabled } from '../../hooks/use-feed-pagination';
import { getCommunityIdentifiers } from '../../hooks/use-community-identifier';
import { useStarterCommunityList } from '../../hooks/use-default-subscriptions';
import FeedFooter from '../../components/feed-footer';
import LoadingEllipsis from '../../components/loading-ellipsis';
import Post from '../../components/post';
import Sidebar from '../../components/sidebar';
import StarterSubscriptionsNotice from '../../components/starter-subscriptions-notice/starter-subscriptions-notice';
import DirectorySubscriptionUpdatesNotice from '../../components/directory-subscription-updates-notice';
import DevelopmentFeedResetButton from '../../components/development-feed-reset-button/development-feed-reset-button-lazy';
import { sortTypes } from '../../constants/sort-types';
import { getHomeSubscriptionState } from './subscription-state';
import styles from './home.module.css';
import { getDisplayAddress } from '../../lib/utils/address-utils';

const lastVirtuosoStates: { [key: string]: StateSnapshot } = {};

const Home = () => {
  const { t } = useTranslation();
  const account = useAccount();
  const subscriptions = account?.subscriptions ?? [];
  const communityAddresses = subscriptions;
  const { isCheckingAccount } = useAutoSubscribeStore();
  const { loading: starterListLoading } = useStarterCommunityList();
  const accountAddress = account?.author?.address;
  const isCheckingSubscriptions = starterListLoading || !accountAddress || isCheckingAccount(accountAddress);

  const params = useParams<{ sortType?: string; timeFilterName?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';
  const navigate = useNavigate();
  const location = useLocation();

  const sortType = params?.sortType && sortTypes.includes(params.sortType) ? params.sortType : sortTypes[0];

  useRedirectToDefaultSort();

  useEffect(() => {
    if ((params?.sortType && !sortTypes.includes(params.sortType)) || (params.timeFilterName && !isValidTimeFilterName(params.timeFilterName))) {
      navigate('/not-found', { replace: true });
    }
  }, [params?.sortType, params.timeFilterName, navigate]);

  const { timeFilterName, timeFilterSeconds, sessionKey, timeFilterNames } = useTimeFilter();

  useEffect(() => {
    if (!params.timeFilterName && !searchQuery && sessionKey) {
      const sessionPreference = sessionStorage.getItem(sessionKey);
      if (sessionPreference && timeFilterNames.includes(sessionPreference)) {
        const targetPath = `/${sortType}/${sessionPreference}${location.search}`;
        console.log(`Redirecting Home from ${location.pathname} to ${targetPath} based on session preference: ${sessionPreference}`);
        navigate(targetPath, { replace: true });
      }
    }
  }, [params.timeFilterName, searchQuery, sessionKey, sortType, navigate, location.search, location.pathname, timeFilterNames]);

  const currentTimeFilterName = params.timeFilterName || timeFilterName || 'hot';

  const { isSearching } = useFeedFiltersStore();
  const infiniteFeedEnabled = useInfiniteFeedEnabled();
  const [showNoResults, setShowNoResults] = useState(false);
  const [searchAttemptCompleted, setSearchAttemptCompleted] = useState(false);

  const commentFilter = useCallback(
    (comment: Comment) => {
      if (!searchQuery.trim()) return true;
      return commentMatchesPattern(comment, searchQuery);
    },
    [searchQuery],
  );

  const feedOptions = useMemo(() => {
    const options: any = {
      newerThan: searchQuery ? 0 : timeFilterSeconds,
      postsPerPage: FEED_POSTS_PER_PAGE,
      sortType,
      communities: getCommunityIdentifiers(communityAddresses),
    };

    if (searchQuery) {
      options.filter = {
        filter: commentFilter,
        key: `search-filter-${searchQuery}`,
      };
    }

    return options;
  }, [communityAddresses, sortType, timeFilterSeconds, searchQuery, commentFilter]);

  const { feed, hasMore, loadMore, reset, communityKeysWithNewerPosts: communityAddressesWithNewerPosts } = useFeed(feedOptions);

  useEffect(() => {
    startTransition(() => {
      setShowNoResults(false);
      setSearchAttemptCompleted(false);
    });
  }, [searchQuery]);

  useEffect(() => {
    if (searchQuery && !isSearching && !searchAttemptCompleted) {
      startTransition(() => {
        setSearchAttemptCompleted(true);
      });
    }
  }, [searchQuery, isSearching, searchAttemptCompleted]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (searchQuery && feed?.length === 0 && searchAttemptCompleted) {
      timer = setTimeout(() => {
        startTransition(() => {
          setShowNoResults(true);
        });
      }, 1500);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [searchQuery, feed?.length, searchAttemptCompleted]);

  const shouldLoadAdditionalFeeds = sortType !== 'top' && !searchQuery;

  const {
    feed: weeklyFeed,
    hasMore: hasMoreWeekly,
    loadMore: loadMoreWeekly,
  } = useFeed({
    communities: getCommunityIdentifiers(shouldLoadAdditionalFeeds ? communityAddresses : []),
    sortType,
    newerThan: 60 * 60 * 24 * 7,
  });
  const {
    feed: monthlyFeed,
    hasMore: hasMoreMonthly,
    loadMore: loadMoreMonthly,
  } = useFeed({
    communities: getCommunityIdentifiers(shouldLoadAdditionalFeeds ? communityAddresses : []),
    sortType,
    newerThan: 60 * 60 * 24 * 30,
  });
  const {
    feed: yearlyFeed,
    hasMore: hasMoreYearly,
    loadMore: loadMoreYearly,
  } = useFeed({
    communities: getCommunityIdentifiers(shouldLoadAdditionalFeeds ? communityAddresses : []),
    sortType,
    newerThan: 60 * 60 * 24 * 365,
  });

  const combinedLoadMore = useCallback(async () => {
    const loadMorePromises = [loadMore()];
    if (shouldLoadAdditionalFeeds) {
      if (hasMoreWeekly) loadMorePromises.push(loadMoreWeekly());
      if (hasMoreMonthly) loadMorePromises.push(loadMoreMonthly());
      if (hasMoreYearly) loadMorePromises.push(loadMoreYearly());
    }
    await Promise.all(loadMorePromises);
  }, [loadMore, shouldLoadAdditionalFeeds, hasMoreWeekly, loadMoreWeekly, hasMoreMonthly, loadMoreMonthly, hasMoreYearly, loadMoreYearly]);

  const virtuosoRef = useRef<VirtuosoHandle | null>(null);

  useEffect(() => {
    const setLastVirtuosoState = () => {
      virtuosoRef.current?.getState((snapshot: StateSnapshot) => {
        if (snapshot?.ranges?.length) {
          lastVirtuosoStates[sortType + currentTimeFilterName + 'home' + searchQuery] = snapshot;
        }
      });
    };
    window.addEventListener('scroll', setLastVirtuosoState);
    return () => window.removeEventListener('scroll', setLastVirtuosoState);
  }, [sortType, currentTimeFilterName, searchQuery]);

  const lastVirtuosoState = lastVirtuosoStates?.[sortType + currentTimeFilterName + 'home' + searchQuery];

  // Memoize the item content renderer to prevent unnecessary rerenders
  const renderPost = useCallback((index: number, post: Comment) => {
    return <Post key={post?.cid} index={index} post={post} />;
  }, []);

  useEffect(() => {
    document.title = `seedit`;
  }, [t]);

  const onClearSearch = useCallback(() => {
    setSearchParams((prev) => {
      prev.delete('q');
      return prev;
    });
    reset();
  }, [setSearchParams, reset]);

  const footerProps = useMemo(
    () => ({
      feedLength: feed?.length ?? 0,
      hasFeedLoaded: !!feed,
      hasMore,
      communityAddresses,
      communityAddressesWithNewerPosts,
      weeklyFeedLength: weeklyFeed.length,
      monthlyFeedLength: monthlyFeed.length,
      yearlyFeedLength: yearlyFeed.length,
      currentTimeFilterName: searchQuery ? 'all' : currentTimeFilterName,
      reset,
      searchQuery: searchQuery,
      isSearching,
      showNoResults,
      onClearSearch,
      onLoadMore: combinedLoadMore,
    }),
    [
      feed,
      hasMore,
      communityAddresses,
      communityAddressesWithNewerPosts,
      weeklyFeed.length,
      monthlyFeed.length,
      yearlyFeed.length,
      searchQuery,
      currentTimeFilterName,
      reset,
      isSearching,
      showNoResults,
      onClearSearch,
      combinedLoadMore,
    ],
  );

  const [safeToShowNoSubscriptions, setSafeToShowNoSubscriptions] = useState(false);

  useEffect(() => {
    if (isCheckingSubscriptions) {
      setSafeToShowNoSubscriptions(false);
      return;
    }

    const timeout = setTimeout(() => setSafeToShowNoSubscriptions(true), 800);
    return () => clearTimeout(timeout);
  }, [isCheckingSubscriptions, accountAddress]);

  const subscriptionState = getHomeSubscriptionState({
    hasSearchQuery: Boolean(searchQuery),
    subscriptionCount: subscriptions.length,
    feedLength: feed?.length,
    isCheckingSubscriptions,
    safeToShowNoSubscriptions,
  });

  return (
    <div>
      <DirectorySubscriptionUpdatesNotice />
      <StarterSubscriptionsNotice />
      <div className={styles.content}>
        <div className={`${styles.sidebar}`}>
          <Sidebar />
        </div>
        {subscriptionState === 'loading' && !searchQuery ? (
          <div className={styles.feed}>
            <div className={styles.footer}>
              <LoadingEllipsis string={t('loading_feed')} />
            </div>
          </div>
        ) : subscriptionState === 'noSubscriptions' && !searchQuery ? (
          <div className={styles.noSubscriptions}>
            <br />
            <Trans
              i18nKey='no_subscriptions_message'
              values={{ accountName: account?.author.displayName || getDisplayAddress(account?.author.shortAddress || '') }}
              components={{
                // eslint-disable-next-line jsx-a11y/heading-has-content
                1: <h1 key='no_subscriptions_message_1' />,
                2: <div className={styles.squash} key='no_subscriptions_message_2' />,
                3: <span className={styles.joinWithThe} key='no_subscriptions_message_3' />,
                4: <img src={'/assets/buttons/all_feed_subscribe.png'} alt='' key='no_subscriptions_message_4' />,
              }}
            />
            <div className={styles.fakePost} />
            <div className={styles.findCommunities}>
              <Link to='/s/all/hot/1m'>{t('find_communities')}</Link>
            </div>
          </div>
        ) : (
          <div className={styles.feed}>
            <DevelopmentFeedResetButton onReset={reset} />
            <Virtuoso
              increaseViewportBy={{ bottom: 1200, top: 1200 }}
              totalCount={feed?.length || 0}
              data={feed}
              computeItemKey={(index, post) => post?.cid || index}
              itemContent={renderPost}
              useWindowScroll={true}
              components={{
                Footer: () => <FeedFooter {...footerProps} />,
              }}
              endReached={infiniteFeedEnabled ? combinedLoadMore : undefined}
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

export default Home;
