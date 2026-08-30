import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCommunity } from '@bitsocial/bitsocial-react-hooks';
import { getCommunityIdentifier } from '../../hooks/use-community-identifier';
import { getFormattedTimeDuration } from '../../lib/utils/time-utils';
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
  // Only the live community object carries createdAt, and only a cached read is
  // affordable here: a results page must not resolve a community per row.
  const liveCommunity = useCommunity({ community: getCommunityIdentifier(community.address), onlyIfCached: true });
  const createdAt = liveCommunity?.createdAt;
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
        {createdAt ? <span> {t('community_for', { date: getFormattedTimeDuration(createdAt) })}</span> : null}
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
