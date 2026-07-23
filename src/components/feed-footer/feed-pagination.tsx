import { useTranslation } from 'react-i18next';
import { useInfiniteFeedEnabled } from '../../hooks/use-feed-pagination';
import styles from './feed-footer.module.css';

interface FeedPaginationProps {
  feedLength: number;
  hasMore: boolean;
  onLoadMore: () => void;
}

const FeedPagination = ({ feedLength, hasMore, onLoadMore }: FeedPaginationProps) => {
  const { t } = useTranslation();
  const infiniteFeedEnabled = useInfiniteFeedEnabled();

  if (infiniteFeedEnabled || !hasMore || feedLength === 0) return null;

  return (
    <div className={styles.loadMoreContainer}>
      <button type='button' className={styles.loadMore} onClick={onLoadMore}>
        {t('load_more')}
      </button>
    </div>
  );
};

export default FeedPagination;
