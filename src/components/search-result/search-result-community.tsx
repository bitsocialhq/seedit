import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { CommunitySearchResult } from '../../lib/utils/community-search-utils';
import { getCommunityPath } from '../../lib/utils/community-route-utils';
import { getSearchPath } from '../../lib/utils/search-utils';
import { getShortDisplayAddress } from '../../lib/utils/address-utils';
import SubscribeButton from '../subscribe-button';
import HighlightedText from './highlighted-text';
import styles from './search-result.module.css';

interface SearchResultCommunityProps {
  community: CommunitySearchResult;
  /** Carried into "search within", so the restricted search runs the same words. */
  query: string;
  /** Carried into "search within", so the restricted search keeps the nsfw choice. */
  nsfw: boolean;
  terms: string[];
}

const SearchResultCommunity = ({ community, nsfw, query, terms }: SearchResultCommunityProps) => {
  const { t } = useTranslation();
  const communityPath = getCommunityPath(community.address);
  const displayAddress = getShortDisplayAddress(community.address);
  const communityLabel = `s/${displayAddress}`;

  return (
    <div className={styles.result}>
      <header className={styles.resultHeader}>
        <Link className={styles.title} to={communityPath}>
          <HighlightedText terms={terms} text={community.title || displayAddress} />
        </Link>
      </header>
      <div className={styles.meta}>
        <span className={styles.subscribe}>
          <SubscribeButton address={community.address} />
        </span>
        {community.nsfw && <span className={`${styles.stamp} ${styles.nsfwStamp}`}>{t('nsfw')}</span>}
        <Link to={communityPath}>
          <HighlightedText terms={terms} text={communityLabel} />
        </Link>
        {community.tags && community.tags.length > 0 && <span> {community.tags.join(', ')}</span>}
      </div>
      {community.description && (
        <div className={styles.body}>
          <HighlightedText terms={terms} text={community.description} />
        </div>
      )}
      <div className={styles.footer}>
        <Link className={styles.footerLink} to={getSearchPath(query, { community: community.address, nsfw })}>
          {t('search_within_community', { community: communityLabel, interpolation: { escapeValue: false } })}
        </Link>
      </div>
    </div>
  );
};

export default SearchResultCommunity;
