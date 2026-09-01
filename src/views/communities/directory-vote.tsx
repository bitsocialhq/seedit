import { Link, Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCommunities, type Community as CommunityType } from '@bitsocial/bitsocial-react-hooks';
import { SEEDIT_DIRECTORY_CODES, isDirectoryCode, type SeeditDirectoryCode } from '../../lib/utils/directory-codes';
import { useDirectoryList } from '../../hooks/use-directory-list';
import { pickDirectoryWinner, sortDirectoryCommunitiesByRank } from '../../lib/utils/directory-list-utils';
import { vendoredDirectoryDefaults } from '../../data/vendored-directory-lists';
import { getCommunityIdentifiers } from '../../hooks/use-community-identifier';
import { getCommunityPath, getDirectoryPath, getDirectoryVotePath } from '../../lib/utils/community-route-utils';
import { getDisplayAddress } from '../../lib/utils/address-utils';
import Label from '../../components/post/label';
import CommunityItem, { NoCommunitiesMessage } from './community-item';
import communityStyles from './communities.module.css';
import styles from './directory-vote.module.css';

const getDirectoryMetadata = (directoryCode: SeeditDirectoryCode) => vendoredDirectoryDefaults.directories[directoryCode];

const DirectoryTags = ({ tags }: { tags: string[] | undefined }) =>
  tags && (
    <div className={styles.directoryTags}>
      {tags.map((tag) => (
        <span key={tag}>{tag}</span>
      ))}
    </div>
  );

const DirectoryIndexRow = ({ directoryCode }: { directoryCode: SeeditDirectoryCode }) => {
  const { t } = useTranslation();
  const { list } = useDirectoryList(directoryCode);
  const winner = list && pickDirectoryWinner(list.communities);
  const { title, description } = getDirectoryMetadata(directoryCode) ?? {};

  return (
    <li className={styles.directoryRow}>
      <div className={styles.directoryTitle}>
        <Link to={getDirectoryVotePath(directoryCode)}>
          s/{directoryCode}
          {title && <span className={styles.directoryName}>: {title}</span>}
        </Link>
      </div>
      {description && <p className={styles.directoryDescription}>{description}</p>}
      <div className={styles.directoryTagline}>
        {winner && (
          <span className={styles.directoryWinner}>
            <Label color='green' text='winner' title={t('directory_winner_explanation')} isFirstInLine />
            <Link to={getCommunityPath(winner.address)}>{getDisplayAddress(winner.address)}</Link>
            <span className={styles.directoryFactSeparator} aria-hidden='true'>
              ·
            </span>
          </span>
        )}
        <span>{t('directory_candidates_count', { count: list?.communities.length ?? 0 })}</span>
        {list && (
          <>
            <span className={styles.directoryFactSeparator} aria-hidden='true'>
              ·
            </span>
            <span>{t('directory_list_revision', { revision: list.revision })}</span>
          </>
        )}
      </div>
    </li>
  );
};

/** Lists every reserved /s/ route so a voter can pick which directory to inspect. */
export const DirectoryIndex = () => (
  <ul className={styles.directoryIndex} role='list'>
    {SEEDIT_DIRECTORY_CODES.map((directoryCode) => (
      <DirectoryIndexRow key={directoryCode} directoryCode={directoryCode} />
    ))}
  </ul>
);

const DirectoryCandidateList = ({ directoryCode }: { directoryCode: SeeditDirectoryCode }) => {
  const { t } = useTranslation();
  const { list } = useDirectoryList(directoryCode);
  const ranked = list ? sortDirectoryCommunitiesByRank(list.communities) : [];

  const { communities } = useCommunities({ communities: getCommunityIdentifiers(ranked.map(({ address }) => address)) });
  // Index by address rather than by request position: a candidate that has not loaded yet must keep
  // its rank instead of dropping out of the competition, and must never inherit a neighbour's data.
  const loadedCommunities = new Map(
    Object.values(communities ?? {})
      .filter((community): community is CommunityType => Boolean(community?.address))
      .map((community) => [community.address, community]),
  );
  const { title, description, tags } = getDirectoryMetadata(directoryCode) ?? {};

  return (
    <>
      <div className={styles.directoryHeading}>
        <div>
          <span className={styles.directoryHeadingTitle}>
            <Link to={getDirectoryPath(directoryCode)}>s/{directoryCode}</Link>
            {title && `: ${title}`}
          </span>
          {list && <span className={styles.directoryRevision}>{t('directory_list_revision', { revision: list.revision })}</span>}
        </div>
        {description && <p className={styles.directoryHeadingDescription}>{description}</p>}
        <DirectoryTags tags={tags} />
      </div>
      {ranked.length === 0 ? (
        <NoCommunitiesMessage />
      ) : (
        ranked.map((candidate, index) => (
          <CommunityItem
            key={candidate.address}
            community={loadedCommunities.get(candidate.address) ?? ({ address: candidate.address } as CommunityType)}
            index={index}
            score={candidate.score}
            owner={candidate.owner}
            isWinner={index === 0}
            nsfw={candidate.nsfw}
            tags={candidate.tags}
            linkTags={false}
          />
        ))
      )}
    </>
  );
};

/** Ranked candidates competing for one reserved /s/ route. */
export const DirectoryCandidates = () => {
  const { directoryCode } = useParams();

  if (!isDirectoryCode(directoryCode)) {
    return <Navigate to='/not-found' replace />;
  }

  return <DirectoryCandidateList directoryCode={directoryCode} />;
};

/** Explains what the vote section is and why the controls are inert, above every vote view. */
export const DirectoryVoteNotice = () => {
  const { t } = useTranslation();

  return (
    <div className={communityStyles.infobar}>
      <div>{t('directory_vote_explanation')}</div>
      <div className={styles.eligibility}>
        {t('directory_vote_not_open')} <Link to='/gold'>{t('directory_vote_eligibility_link')}</Link>
      </div>
    </div>
  );
};
