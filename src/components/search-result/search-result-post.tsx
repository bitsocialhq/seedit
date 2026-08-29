import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Comment } from '@bitsocial/bitsocial-react-hooks';
import { getCommunityPostPath, getCommunityPath } from '../../lib/utils/community-route-utils';
import { getShortDisplayAddress } from '../../lib/utils/address-utils';
import { getFormattedTimeAgo } from '../../lib/utils/time-utils';
import { getPostScore } from '../../lib/utils/post-utils';
import HighlightedText from './highlighted-text';
import styles from './search-result.module.css';

interface SearchResultPostProps {
  comment: Comment;
  terms: string[];
}

/**
 * One matched post or reply, laid out the way the results page shows a result:
 * title, a meta line, a collapsed excerpt, and the linked url for a link post.
 */
const SearchResultPost = ({ comment, terms }: SearchResultPostProps) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const { cid, communityAddress, content, downvoteCount, link, replyCount, thumbnailUrl, timestamp, title, upvoteCount } = comment;
  const authorAddress = comment.author?.address;
  const authorName = comment.author?.displayName || comment.author?.shortAddress || authorAddress;
  const postPath = communityAddress && cid ? getCommunityPostPath(communityAddress, comment.postCid || cid) : undefined;
  const score = getPostScore(upvoteCount ?? 0, downvoteCount ?? 0, comment.state ?? 'succeeded');
  const communityLabel = `s/${getShortDisplayAddress(communityAddress)}`;
  // A reply has no title of its own, so its excerpt is what identifies it.
  const heading = title || content || communityLabel;

  return (
    <div className={styles.result}>
      {thumbnailUrl && postPath && (
        <Link to={postPath}>
          <img alt='' className={styles.thumbnail} loading='lazy' src={thumbnailUrl} />
        </Link>
      )}
      <div className={styles.resultContent}>
        <header className={styles.resultHeader}>
          {postPath ? (
            <Link className={styles.title} to={postPath}>
              <HighlightedText terms={terms} text={heading} />
            </Link>
          ) : (
            <span className={styles.title}>
              <HighlightedText terms={terms} text={heading} />
            </span>
          )}
        </header>
        <div className={styles.meta}>
          <span>
            {score} {score === 1 ? t('point') : t('points')}
          </span>{' '}
          {postPath && (
            <>
              <Link to={postPath}>
                {replyCount ?? 0} {replyCount === 1 ? t('post_comment') : t('post_comments')}
              </Link>{' '}
            </>
          )}
          <span>
            {t('submitted')} {getFormattedTimeAgo(timestamp)}
          </span>{' '}
          {authorAddress && (
            <span>
              {t('post_by')} <Link to={`/u/${authorAddress}`}>{authorName}</Link>
            </span>
          )}{' '}
          {communityAddress && (
            <span>
              {t('post_to')} <Link to={getCommunityPath(communityAddress)}>{communityLabel}</Link>
            </span>
          )}
        </div>
        {title && content && (
          <>
            <div className={`${styles.body} ${expanded ? '' : styles.collapsedBody}`}>
              <HighlightedText terms={terms} text={content} />
            </div>
            <button className={styles.expandoButton} onClick={() => setExpanded((current) => !current)} type='button'>
              {expanded ? t('search_excerpt_less') : t('search_excerpt_more')}
            </button>
          </>
        )}
        {link && (
          <div className={styles.footer}>
            <a className={styles.footerLink} href={link} rel='noopener noreferrer' target='_blank'>
              {link}
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResultPost;
