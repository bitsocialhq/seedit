import { Crosspost, useCrosspost } from '@bitsocial/bitsocial-react-hooks';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { getDisplayAddress, getShortDisplayAddress } from '../../../lib/utils/address-utils';
import { getCommentCommunityAddress } from '../../../lib/utils/comment-utils';
import { getCommunityPostPath } from '../../../lib/utils/community-route-utils';
import { getHostname } from '../../../lib/utils/url-utils';
import styles from './crosspost-preview.module.css';

interface CrosspostPreviewProps {
  crosspost: Crosspost;
}

const CrosspostPreview = ({ crosspost }: CrosspostPreviewProps) => {
  const { t } = useTranslation();
  const source = useCrosspost({ crosspost });
  const { author, cid, content, isCommunityVerified, link, signature, title } = source;
  const communityAddress = isCommunityVerified ? getCommentCommunityAddress(source) : undefined;
  const sourcePath = communityAddress && cid ? getCommunityPostPath(communityAddress, cid) : undefined;
  const authorAddress = author?.nameResolved === true ? author.address : signature?.publicKey;
  const authorLabel = author?.displayName || (authorAddress ? getShortDisplayAddress(authorAddress) : undefined);
  const communityLabel = communityAddress ? getDisplayAddress(getShortDisplayAddress(communityAddress)) : undefined;
  const trimmedContent = content?.trim();
  const excerpt = trimmedContent && trimmedContent.length > 280 ? `${trimmedContent.slice(0, 280).trim()}…` : trimmedContent;
  const displayTitle = title?.trim() || excerpt || getShortDisplayAddress(cid || crosspost.cid);
  const hostname = getHostname(link);

  return (
    <section className={styles.preview} aria-label={t('crosspost')}>
      <div className={styles.meta}>
        <span className={styles.label}>{t('crosspost')}</span>
        {communityLabel && sourcePath && (
          <>
            {' '}
            <span className={styles.separator}>·</span> <Link to={sourcePath}>s/{communityLabel}</Link>
          </>
        )}
        {authorLabel && (
          <>
            {' '}
            <span className={styles.separator}>·</span> {t('post_by')} <span className={styles.author}>{authorLabel}</span>
          </>
        )}
      </div>
      <div className={styles.title}>{sourcePath ? <Link to={sourcePath}>{displayTitle}</Link> : displayTitle}</div>
      {excerpt && excerpt !== displayTitle && <div className={styles.excerpt}>{excerpt}</div>}
      {link && (
        <a className={styles.externalLink} href={link} target='_blank' rel='noopener noreferrer'>
          {hostname || link}
        </a>
      )}
    </section>
  );
};

export default CrosspostPreview;
