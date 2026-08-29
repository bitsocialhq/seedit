import { useEffect, useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { loadMoreArchiveSearch, retryArchiveSearch, useArchiveSearch } from '../../hooks/use-archive-search';
import { useCommunitySearch, useNsfwCommunityAddresses } from '../../hooks/use-community-search';
import { DEFAULT_SEARCH_QUERY, getSearchOptions, getSearchPath, getSearchQuery } from '../../lib/utils/search-utils';
import { getHighlightTerms } from '../../lib/utils/search-highlight-utils';
import { getShortDisplayAddress } from '../../lib/utils/address-utils';
import SearchResultCommunity from '../../components/search-result/search-result-community';
import SearchResultGroup from '../../components/search-result/search-result-group';
import SearchResultPost from '../../components/search-result/search-result-post';
import Sidebar from '../../components/sidebar';
import homeStyles from '../home/home.module.css';
import styles from '../../components/search-result/search-result.module.css';

/** How many community matches a group shows before "load more" reveals the next batch. */
const COMMUNITY_PAGE_SIZE = 5;

const Search = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const query = getSearchQuery(searchParams.get('q'));
  const options = useMemo(() => getSearchOptions(searchParams), [searchParams]);
  const { community: restrictedCommunity, nsfw = false } = options;

  const terms = useMemo(() => getHighlightTerms(query), [query]);

  // Community matches are seedit's own; a search already pinned to one community does not repeat it.
  const { communities } = useCommunitySearch(restrictedCommunity ? '' : query, nsfw);
  const [visibleCommunities, setVisibleCommunities] = useState(COMMUNITY_PAGE_SIZE);
  const [communityPageKey, setCommunityPageKey] = useState('');
  const currentCommunityPageKey = `${query}|${nsfw}|${restrictedCommunity ?? ''}`;
  // Reset the reveal count when the search changes, without waiting for an effect.
  if (communityPageKey !== currentCommunityPageKey) {
    setCommunityPageKey(currentCommunityPageKey);
    setVisibleCommunities(COMMUNITY_PAGE_SIZE);
  }

  const { comments, error, hasMore, loading, loadingMore, provider, total } = useArchiveSearch(query, options);
  const nsfwCommunityAddresses = useNsfwCommunityAddresses();
  const posts = useMemo(
    () => (nsfw ? comments : comments.filter((comment) => !nsfwCommunityAddresses.has((comment.communityAddress ?? '').toLowerCase()))),
    [comments, nsfw, nsfwCommunityAddresses],
  );

  const documentTitle = `${t('search_results')}: ${query} - Seedit`;
  useEffect(() => {
    document.title = documentTitle;
  }, [documentTitle]);

  // /search never runs empty: with no query in the URL it searches for seedit itself
  if (!query) {
    return <Navigate to={getSearchPath(DEFAULT_SEARCH_QUERY, options)} replace />;
  }

  const shownCommunities = communities.slice(0, visibleCommunities);

  return (
    <div>
      <div className={homeStyles.content}>
        <div className={homeStyles.sidebar}>
          <Sidebar />
        </div>
        <div className={styles.listing}>
          {/* An unlabelled group, the way the results page shows community matches; hidden when nothing matched. */}
          {!restrictedCommunity && shownCommunities.length > 0 && (
            <SearchResultGroup
              hasMore={communities.length > shownCommunities.length}
              isEmpty={false}
              onLoadMore={() => setVisibleCommunities((current) => current + COMMUNITY_PAGE_SIZE)}
            >
              {shownCommunities.map((community) => (
                <SearchResultCommunity community={community} key={community.address} nsfw={nsfw} query={query} terms={terms} />
              ))}
            </SearchResultGroup>
          )}

          <SearchResultGroup
            hasMore={hasMore}
            heading={
              restrictedCommunity
                ? t('search_results_in', { community: `s/${getShortDisplayAddress(restrictedCommunity)}`, interpolation: { escapeValue: false } })
                : t('posts')
            }
            isEmpty={!loading && !error && posts.length === 0}
            loadingMore={loadingMore}
            onLoadMore={() => loadMoreArchiveSearch(query, options)}
          >
            {loading && <p className={styles.info}>{t('searching')}</p>}
            {error && (
              <p className={styles.error}>
                {t('search_provider_unavailable')}
                <button className={styles.retry} onClick={() => retryArchiveSearch(query, options)} type='button'>
                  {t('retry')}
                </button>
              </p>
            )}
            {posts.map((comment) => (
              <SearchResultPost comment={comment} key={comment.cid} terms={terms} />
            ))}
          </SearchResultGroup>

          {provider && total > 0 && (
            <p className={styles.info}>
              {t('results_provided_by')}{' '}
              <a href={provider.siteUrl} rel='noopener noreferrer' target='_blank'>
                {provider.name}
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Search;
