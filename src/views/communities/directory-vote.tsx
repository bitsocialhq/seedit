import { Link, Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Community as CommunityType, useCommunities } from '@bitsocial/bitsocial-react-hooks';
import { SEEDIT_DIRECTORY_CODES, isDirectoryCode, type SeeditDirectoryCode } from '../../lib/utils/directory-codes';
import { useDirectoryList } from '../../hooks/use-directory-list';
import { pickDirectoryWinner, sortDirectoryCommunitiesByRank } from '../../lib/utils/directory-list-utils';
import { vendoredDirectoryDefaults } from '../../data/vendored-directory-lists';
import { getCommunityIdentifiers } from '../../hooks/use-community-identifier';
import { getCommunityPath, getDirectoryPath, getDirectoryVotePath } from '../../lib/utils/community-route-utils';
import { getDisplayAddress } from '../../lib/utils/address-utils';
import CommunityItem, { NoCommunitiesMessage } from './community-item';
import communityStyles from './communities.module.css';
import styles from './directory-vote.module.css';

const getDirectoryTitle = (directoryCode: SeeditDirectoryCode): string | undefined => vendoredDirectoryDefaults.directories[directoryCode]?.title;

const DirectoryIndexRow = ({ directoryCode }: { directoryCode: SeeditDirectoryCode }) => {
  const { t } = useTranslation();
  const { list } = useDirectoryList(directoryCode);
  const winner = list && pickDirectoryWinner(list.communities);
  const title = getDirectoryTitle(directoryCode);

  return (
    <div className={styles.directoryRow}>
      <div className={styles.directoryTitle}>
        <Link to={getDirectoryVotePath(directoryCode)}>
          s/{directoryCode}
          {title && `: ${title}`}
        </Link>
      </div>
      <div className={styles.directoryTagline}>
        {t('directory_candidates_count', { count: list?.communities.length ?? 0 })}
        {winner && (
          <>
            {' — '}
            {t('directory_route_currently_recommends', { directoryCode })} <Link to={getCommunityPath(winner.address)}>{getDisplayAddress(winner.address)}</Link>
          </>
        )}
      </div>
    </div>
  );
};

/** Lists every reserved /s/ route so a voter can pick which directory to inspect. */
export const DirectoryIndex = () => (
  <div className={styles.directoryIndex}>
    {SEEDIT_DIRECTORY_CODES.map((directoryCode) => (
      <DirectoryIndexRow key={directoryCode} directoryCode={directoryCode} />
    ))}
  </div>
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
  const title = getDirectoryTitle(directoryCode);

  return (
    <>
      <div className={styles.directoryHeading}>
        <span className={styles.directoryHeadingTitle}>
          <Link to={getDirectoryPath(directoryCode)}>s/{directoryCode}</Link>
          {title && `: ${title}`}
        </span>
        {list && <span className={styles.directoryRevision}>{t('directory_list_revision', { revision: list.revision })}</span>}
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
