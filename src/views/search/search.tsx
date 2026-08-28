import { useEffect, useRef } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StateSnapshot, Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { loadMoreArchiveSearch, retryArchiveSearch, useArchiveSearch } from '../../hooks/use-archive-search';
import { useInfiniteFeedEnabled } from '../../hooks/use-feed-pagination';
import { DEFAULT_SEARCH_QUERY, getSearchPath, getSearchQuery } from '../../lib/utils/search-utils';
import FeedPagination from '../../components/feed-footer/feed-pagination';
import LoadingEllipsis from '../../components/loading-ellipsis';
import Post from '../../components/post';
import Reply from '../../components/reply';
import Sidebar from '../../components/sidebar';
import styles from '../home/home.module.css';

const lastVirtuosoStates: { [key: string]: StateSnapshot } = {};

interface SearchFooterProps {
  query: string;
}

const SearchFooter = ({ query }: SearchFooterProps) => {
  const { t } = useTranslation();
  const { comments, error, hasMore, loading, loadingMore, provider, total } = useArchiveSearch(query);

  let footerContent;
  if (loading || loadingMore) {
    footerContent = (
      <div className={styles.stateString}>
        <LoadingEllipsis string={loadingMore ? t('looking_for_more_posts') : t('searching')} />
      </div>
    );
  } else if (error) {
    footerContent = (
      <div className={styles.stateString}>
        <span className={styles.noMatchesFound}>{t('search_provider_unavailable')}</span>
        <br />
        <br />
        <div className={styles.morePostsSuggestion}>
          <span className={styles.link} onClick={() => retryArchiveSearch(query)}>
            {t('retry')}
          </span>
        </div>
      </div>
    );
  } else if (total === 0) {
    footerContent = (
      <div className={styles.stateString}>
        <span className={styles.noMatchesFound}>{t('no_matches_found_for', { query })}</span>
      </div>
    );
  } else {
    footerContent = (
      <div className={styles.stateString}>
        <span>{t('found_n_results_for', { count: total, query })}</span>
        {provider && (
          <>
            <br />
            <span>
              {t('results_provided_by')}{' '}
              <a href={provider.siteUrl} target='_blank' rel='noopener noreferrer'>
                {provider.name}
              </a>
            </span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={styles.footer}>
      {footerContent}
      <FeedPagination feedLength={comments.length} hasMore={hasMore} onLoadMore={() => loadMoreArchiveSearch(query)} />
    </div>
  );
};

const Search = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const query = getSearchQuery(searchParams.get('q'));
  const { comments, hasMore, parents } = useArchiveSearch(query);
  const infiniteFeedEnabled = useInfiniteFeedEnabled();

  const documentTitle = `${t('search_results')}: ${query} - Seedit`;
  useEffect(() => {
    document.title = documentTitle;
  }, [documentTitle]);

  const virtuosoRef = useRef<VirtuosoHandle | null>(null);

  useEffect(() => {
    const setLastVirtuosoState = () => {
      virtuosoRef.current?.getState((snapshot: StateSnapshot) => {
        if (snapshot?.ranges?.length) {
          lastVirtuosoStates[query] = snapshot;
        }
      });
    };
    window.addEventListener('scroll', setLastVirtuosoState);
    return () => window.removeEventListener('scroll', setLastVirtuosoState);
  }, [query]);

  const lastVirtuosoState = lastVirtuosoStates?.[query];

  // /search never runs empty: with no query in the URL it searches for seedit itself
  if (!query) {
    return <Navigate to={getSearchPath(DEFAULT_SEARCH_QUERY)} replace />;
  }

  return (
    <div>
      <div className={styles.content}>
        <div className={`${styles.sidebar}`}>
          <Sidebar />
        </div>
        <Virtuoso
          increaseViewportBy={{ bottom: 1200, top: 600 }}
          totalCount={comments.length}
          data={comments}
          itemContent={(index, comment) =>
            comment?.parentCid ? (
              <Reply index={index} isSingleReply={true} reply={comment} parentComment={comment.postCid ? parents[comment.postCid] : undefined} />
            ) : (
              <Post index={index} post={comment} />
            )
          }
          useWindowScroll={true}
          components={{ Footer: () => <SearchFooter query={query} /> }}
          endReached={infiniteFeedEnabled && hasMore ? () => loadMoreArchiveSearch(query) : undefined}
          ref={virtuosoRef}
          restoreStateFrom={lastVirtuosoState}
          initialScrollTop={lastVirtuosoState?.scrollTop}
        />
      </div>
    </div>
  );
};

export default Search;
