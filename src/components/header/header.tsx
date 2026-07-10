import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAccount, useCommunity } from '@bitsocial/bitsocial-react-hooks';
import { sortTypes } from '../../constants/sort-types';
import { sortLabels } from '../../constants/sort-labels';
import {
  getAboutLink,
  isAllView,
  isAllAboutView,
  isAuthorView,
  isAuthorCommentsView,
  isAuthorSubmittedView,
  isCreateCommunityView,
  isHomeAboutView,
  isHomeView,
  isInboxView,
  isModView,
  isPendingPostView,
  isPostPageView,
  isProfileView,
  isProfileCommentsView,
  isProfileDownvotedView,
  isProfileSubmittedView,
  isProfileHiddenView,
  isSettingsView,
  isSubmitView,
  isCommunityView,
  isCommunitySettingsView,
  isCommunitySubmitView,
  isCommunitiesView,
  isCommunitiesSubscriberView,
  isCommunitiesModeratorView,
  isCommunitiesAdminView,
  isCommunitiesVoteView,
  isCommunitiesOwnerView,
  isProfileUpvotedView,
  isSettingsContentOptionsView,
  isSettingsAdvancedView,
  isSettingsP2pStatsView,
  isCommunityAboutView,
  isDomainView,
  isPostPageAboutView,
  isSettingsAccountDataView,
} from '../../lib/utils/view-utils';
import getShortAddress from '../../lib/utils/address-utils';
import useContentOptionsStore from '../../stores/use-content-options-store';
import useNotFoundStore from '../../stores/use-not-found-store';
import { useIsNsfwCommunity } from '../../hooks/use-is-nsfw-community';
import useTheme from '../../hooks/use-theme';
import useWindowWidth from '../../hooks/use-window-width';
import { getCommunityIdentifier } from '../../hooks/use-community-identifier';
import useOptionalAccountComment from '../../hooks/use-account-comment';
import styles from './header.module.css';

const AboutButton = () => {
  const { t } = useTranslation();
  const params = useParams();
  const location = useLocation();
  const aboutLink = getAboutLink(location.pathname, params);
  const isInHomeAboutView = isHomeAboutView(location.pathname);
  const isInPostPageAboutView = isPostPageAboutView(location.pathname, params);
  const isInCommunityAboutView = isCommunityAboutView(location.pathname, params);

  return (
    <li className={`${styles.about} ${isInHomeAboutView || isInCommunityAboutView || isInPostPageAboutView ? styles.selected : styles.choice}`}>
      <Link to={aboutLink}>{t('about')}</Link>
    </li>
  );
};

const CommentsButton = () => {
  const { t } = useTranslation();
  const params = useParams();
  const location = useLocation();
  const isInPostPageView = isPostPageView(location.pathname, params);
  const isInPendingPostView = isPendingPostView(location.pathname, params);
  const isInHomeAboutView = isHomeAboutView(location.pathname);
  const isInPostPageAboutView = isPostPageAboutView(location.pathname, params);

  return (
    <li className={(isInPostPageView || isInPendingPostView) && !isInHomeAboutView && !isInPostPageAboutView ? styles.selected : styles.choice}>
      <Link to={`/s/${params.communityAddress}/c/${params.commentCid}`} onClick={(e) => isInPendingPostView && e.preventDefault()}>
        {t('comments')}
      </Link>
    </li>
  );
};

const SortItems = () => {
  const { t } = useTranslation();
  const params = useParams();
  const location = useLocation();
  const isInHomeAboutView = isHomeAboutView(location.pathname);
  const isInPostPageAboutView = isPostPageAboutView(location.pathname, params);
  const isInCommunityAboutView = isCommunityAboutView(location.pathname, params);
  const isInAllView = isAllView(location.pathname);
  const isInModView = isModView(location.pathname);
  const isInDomainView = isDomainView(location.pathname);
  const isInCommunityView = isCommunityView(location.pathname, params);
  // Derive selection directly from route instead of syncing via an effect
  const selectedSortType = isInHomeAboutView || isInCommunityAboutView || isInPostPageAboutView ? '' : params.sortType || 'hot';
  const timeFilterName = params.timeFilterName;

  return sortTypes.map((sortType, index) => {
    let sortLink = isInCommunityView
      ? `/s/${params.communityAddress}/${sortType}`
      : isInAllView
        ? `/s/all/${sortType}`
        : isInModView
          ? `/s/mod/${sortType}`
          : isInDomainView
            ? `/domain/${params.domain}/${sortType}`
            : sortType;
    if (timeFilterName) {
      sortLink = sortLink + `/${timeFilterName}`;
    }
    return (
      <li key={sortType} className={selectedSortType === sortType ? styles.selected : styles.choice}>
        <Link to={sortLink}>{t(sortLabels[index])}</Link>
      </li>
    );
  });
};

const AuthorHeaderTabs = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const params = useParams();
  const isInAuthorView = isAuthorView(location.pathname);
  const isInAuthorCommentsView = isAuthorCommentsView(location.pathname, params);
  const isInAuthorSubmittedView = isAuthorSubmittedView(location.pathname, params);
  const isInProfileDownvotedView = isProfileDownvotedView(location.pathname);
  const isInProfileView = isProfileView(location.pathname);
  const isInProfileCommentsView = isProfileCommentsView(location.pathname);
  const isInProfileSubmittedView = isProfileSubmittedView(location.pathname);
  const isInProfileUpvotedView = isProfileUpvotedView(location.pathname);
  const isInProfileHiddenView = isProfileHiddenView(location.pathname);

  const authorRoute = `/u/${params.authorAddress}/c/${params.commentCid}`;
  const overviewSelectedClass =
    (isInProfileView || isInAuthorView) &&
    !isInProfileUpvotedView &&
    !isInProfileDownvotedView &&
    !isInProfileCommentsView &&
    !isInProfileSubmittedView &&
    !isInAuthorCommentsView &&
    !isInProfileHiddenView &&
    !isInAuthorSubmittedView
      ? styles.selected
      : styles.choice;

  return (
    <>
      <li className={overviewSelectedClass}>
        <Link to={isInAuthorView ? authorRoute : '/profile'}>{t('overview')}</Link>
      </li>
      <li className={isInProfileCommentsView || isInAuthorCommentsView ? styles.selected : styles.choice}>
        <Link to={isInAuthorView ? authorRoute + '/comments' : '/profile/comments'}>{t('comments')}</Link>
      </li>
      <li className={isInProfileSubmittedView || isInAuthorSubmittedView ? styles.selected : styles.choice}>
        <Link to={isInAuthorView ? authorRoute + '/submitted' : '/profile/submitted'}>{t('submitted')}</Link>
      </li>
      {isInProfileView && (
        <>
          <li className={isInProfileUpvotedView ? styles.selected : styles.choice}>
            <Link to='/profile/upvoted'>{t('upvoted')}</Link>
          </li>
          <li className={isInProfileDownvotedView ? styles.selected : styles.choice}>
            <Link to='/profile/downvoted'>{t('downvoted')}</Link>
          </li>
          <li className={isInProfileHiddenView ? styles.selected : styles.choice}>
            <Link to={'/profile/hidden'}>{t('hidden')}</Link>
          </li>
          {/* TODO: implement functionality from API once available
          <li>
            <Link to={'/'} className={styles.choice} onClick={(e) => e.preventDefault()}>
              {t('saved')}
            </Link>
          </li> */}
        </>
      )}
    </>
  );
};

const InboxHeaderTabs = () => {
  const { t } = useTranslation();

  return (
    <>
      <li className={styles.selected}>
        <Link to={'/inbox'}>{t('inbox')}</Link>
      </li>
      {/* TODO: add tabs for messaging when available in the API */}
    </>
  );
};

const CommunitiesHeaderTabs = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const isInCommunitiesSubscriberView = isCommunitiesSubscriberView(location.pathname);
  const isInCommunitiesModeratorView = isCommunitiesModeratorView(location.pathname);
  const isInCommunitiesAdminView = isCommunitiesAdminView(location.pathname);
  const isInCommunitiesOwnerView = isCommunitiesOwnerView(location.pathname);
  const isInCommunitiesVoteView = isCommunitiesVoteView(location.pathname);
  const isInCommunitiesView =
    isCommunitiesView(location.pathname) &&
    !isInCommunitiesSubscriberView &&
    !isInCommunitiesModeratorView &&
    !isInCommunitiesAdminView &&
    !isInCommunitiesOwnerView &&
    !isInCommunitiesVoteView;

  return (
    <>
      <li className={`${isInCommunitiesVoteView ? styles.selected : styles.choice}`}>
        <Link to={'/communities/vote'}>{t('vote')}</Link>
      </li>
      <li
        className={
          isInCommunitiesSubscriberView || isInCommunitiesModeratorView || isInCommunitiesAdminView || isInCommunitiesOwnerView || isInCommunitiesView
            ? styles.selected
            : styles.choice
        }
      >
        <Link to={'/communities'}>{t('my_communities')}</Link>
      </li>
    </>
  );
};

const SettingsHeaderTabs = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const isInSettingsAdvancedView = isSettingsAdvancedView(location.pathname);
  const isInSettingsP2pStatsView = isSettingsP2pStatsView(location.pathname);
  const isInSettingsContentOptionsView = isSettingsContentOptionsView(location.pathname);
  const isInSettingsAccountDataView = isSettingsAccountDataView(location.pathname);

  return (
    <>
      <li
        className={
          isInSettingsAdvancedView || isInSettingsP2pStatsView || isInSettingsContentOptionsView || isInSettingsAccountDataView ? styles.choice : styles.selected
        }
      >
        <Link to={'/settings'}>{t('general')}</Link>
      </li>
      <li className={isInSettingsContentOptionsView ? styles.selected : styles.choice}>
        <Link to={'/settings/content-options'}>{t('content_options')}</Link>
      </li>
      <li className={isInSettingsAdvancedView ? styles.selected : styles.choice}>
        <Link to={'/settings/advanced'}>{t('advanced')}</Link>
      </li>
      <li className={isInSettingsP2pStatsView ? styles.selected : styles.choice}>
        <Link to={'/settings/p2p-stats'}>{t('p2p_stats')}</Link>
      </li>
    </>
  );
};

const HeaderTabs = () => {
  const params = useParams();
  const location = useLocation();
  const isInAllView = isAllView(location.pathname);
  const isInAuthorView = isAuthorView(location.pathname);
  const isInDomainView = isDomainView(location.pathname);
  const isInHomeAboutView = isHomeAboutView(location.pathname);
  const isInPostPageAboutView = isPostPageAboutView(location.pathname, params);
  const isInHomeView = isHomeView(location.pathname);
  const isInInboxView = isInboxView(location.pathname);
  const isInModView = isModView(location.pathname);
  const isInPendingPostView = isPendingPostView(location.pathname, params);
  const isInPostPageView = isPostPageView(location.pathname, params);
  const isInProfileView = isProfileView(location.pathname);
  const isInCommunityView = isCommunityView(location.pathname, params);
  const isInCommunitySettingsView = isCommunitySettingsView(location.pathname, params);
  const isInCommunitySubmitView = isCommunitySubmitView(location.pathname, params);
  const isInCommunitiesView = isCommunitiesView(location.pathname);
  const isInCreateCommunityView = isCreateCommunityView(location.pathname);
  const isInSettingsView = isSettingsView(location.pathname);
  const isInSettingsContentOptionsView = isSettingsContentOptionsView(location.pathname);
  const isInSettingsAdvancedView = isSettingsAdvancedView(location.pathname);

  if (isInPostPageView || isInPendingPostView) {
    return <CommentsButton />;
  } else if (
    isInHomeView ||
    isInHomeAboutView ||
    isInPostPageAboutView ||
    (isInCommunityView && !isInCommunitySubmitView && !isInCommunitySettingsView) ||
    isInAllView ||
    isInModView ||
    isInDomainView
  ) {
    return <SortItems />;
  } else if (isInProfileView || isInAuthorView) {
    return <AuthorHeaderTabs />;
  } else if (isInInboxView) {
    return <InboxHeaderTabs />;
  } else if (isInCommunitiesView && !isInCreateCommunityView) {
    return <CommunitiesHeaderTabs />;
  } else if (isInSettingsView || isInSettingsAdvancedView || isInSettingsContentOptionsView) {
    return <SettingsHeaderTabs />;
  }
  return null;
};

const HeaderTitle = ({ title, pendingPostCommunityAddress }: { title: string; pendingPostCommunityAddress?: string }) => {
  const account = useAccount();
  const { t } = useTranslation();
  const params = useParams();
  const location = useLocation();
  const isInAllView = isAllView(location.pathname);
  const isInAuthorView = isAuthorView(location.pathname);
  const isInDomainView = isDomainView(location.pathname);
  const isInInboxView = isInboxView(location.pathname);
  const isInModView = isModView(location.pathname);
  const isInPendingPostView = isPendingPostView(location.pathname, params);
  const isInPostPageView = isPostPageView(location.pathname, params);
  const isInProfileView = isProfileView(location.pathname);
  const isInSettingsView = isSettingsView(location.pathname);
  const isInSettingsContentOptionsView = isSettingsContentOptionsView(location.pathname);
  const isInSettingsAdvancedView = isSettingsAdvancedView(location.pathname);
  const isInSubmitView = isSubmitView(location.pathname);
  const isInCommunityView = isCommunityView(location.pathname, params);
  const isInCommunitySubmitView = isCommunitySubmitView(location.pathname, params);
  const isInCommunitySettingsView = isCommunitySettingsView(location.pathname, params);
  const isInCommunitiesView = isCommunitiesView(location.pathname);
  const isInCreateCommunityView = isCreateCommunityView(location.pathname);
  const isInNotFoundView = useNotFoundStore((state) => state.isNotFound);

  const communityAddress = params.communityAddress;

  const { hideNsfwCommunities } = useContentOptionsStore();
  const isHiddenNsfwCommunity = useIsNsfwCommunity(communityAddress || '') && hideNsfwCommunities;

  const communityTitle = (
    <Link to={`/s/${isInPendingPostView ? pendingPostCommunityAddress : communityAddress}`}>
      {title || (communityAddress && getShortAddress(communityAddress)) || (pendingPostCommunityAddress && getShortAddress(pendingPostCommunityAddress))}
    </Link>
  );
  const domainTitle = <Link to={`/domain/${params.domain}`}>{params.domain}</Link>;
  const submitTitle = <span className={styles.submitTitle}>{t('submit')}</span>;
  const profileTitle = <Link to='/profile'>{account?.author?.shortAddress}</Link>;
  const authorTitle = <Link to={`/u/${params.authorAddress}/c/${params.commentCid}`}>{params.authorAddress && getShortAddress(params.authorAddress)}</Link>;

  if (isHiddenNsfwCommunity) {
    return <span>{t('over_18')}</span>;
  } else if (isInCommunitySubmitView) {
    return (
      <>
        {communityTitle}: {submitTitle}
      </>
    );
  } else if (isInCommunitySettingsView) {
    return (
      <>
        {communityTitle}: <span className={styles.lowercase}>{t('community_settings')}</span>
      </>
    );
  } else if (isInSubmitView) {
    return submitTitle;
  } else if (isInSettingsView || isInSettingsAdvancedView || isInSettingsContentOptionsView) {
    return t('preferences');
  } else if (isInProfileView && !isInPendingPostView) {
    return profileTitle;
  } else if (isInPostPageView || isInPendingPostView || (isInCommunityView && !isInCommunitySettingsView)) {
    return communityTitle;
  } else if (isInAuthorView) {
    return authorTitle;
  } else if (isInInboxView) {
    return t('messages');
  } else if (isInCreateCommunityView) {
    return <span className={styles.lowercase}>{t('create_community')}</span>;
  } else if (isInCommunitiesView) {
    return t('communities');
  } else if (isInNotFoundView) {
    return <span className={styles.lowercase}>{t('page_not_found')}</span>;
  } else if (isInAllView) {
    return t('all');
  } else if (isInModView) {
    return <span className={styles.lowercase}>{t('communities_you_moderate')}</span>;
  } else if (isInDomainView) {
    return domainTitle;
  }
  return null;
};

const Header = () => {
  const { t } = useTranslation();
  const [theme] = useTheme();
  const location = useLocation();
  const params = useParams();
  const community = useCommunity(params?.communityAddress ? { community: getCommunityIdentifier(params.communityAddress), onlyIfCached: true } : undefined);
  const { suggested, title } = community || {};

  const accountComment = useOptionalAccountComment(params?.accountCommentIndex);

  const isMobile = useWindowWidth() < 640;
  const isInAllAboutView = isAllAboutView(location.pathname);
  const isInAllView = isAllView(location.pathname);
  const isInAuthorView = isAuthorView(location.pathname);
  const isInDomainView = isDomainView(location.pathname);
  const isInHomeView = isHomeView(location.pathname);
  const isInHomeAboutView = isHomeAboutView(location.pathname);
  const isInInboxView = isInboxView(location.pathname);
  const isInModView = isModView(location.pathname);
  const isInPostPageView = isPostPageView(location.pathname, params);
  const isInPostPageAboutView = isPostPageAboutView(location.pathname, params);
  const isInPendingPostView = isPendingPostView(location.pathname, params);
  const isInProfileView = isProfileView(location.pathname);
  const isInSettingsView = isSettingsView(location.pathname);
  const isInCommunityView = isCommunityView(location.pathname, params);
  const isInCommunityAboutView = isCommunityAboutView(location.pathname, params);
  const isInSubmitView = isSubmitView(location.pathname);
  const isInCommunitySubmitView = isCommunitySubmitView(location.pathname, params);
  const isInCommunitySettingsView = isCommunitySettingsView(location.pathname, params);
  const isInNotFoundView = useNotFoundStore((state) => state.isNotFound);

  const hasFewTabs = isInPostPageView || isInSubmitView || isInCommunitySubmitView || isInCommunitySettingsView || isInSettingsView || isInInboxView || isInSettingsView;
  const hasStickyHeader =
    isInHomeView ||
    isInNotFoundView ||
    (isInCommunityView &&
      !isInCommunitySubmitView &&
      !isInCommunitySettingsView &&
      !isInPostPageView &&
      !isInHomeAboutView &&
      !isInCommunityAboutView &&
      !isInPostPageAboutView) ||
    (isInProfileView && !isInHomeAboutView) ||
    (isInAllView && !isInAllAboutView) ||
    (isInModView && !isInHomeAboutView) ||
    (isInDomainView && !isInHomeAboutView) ||
    (isInAuthorView && !isInHomeAboutView);

  const communityAddress = params.communityAddress;

  const { hideNsfwCommunities } = useContentOptionsStore();
  const isHiddenNsfwCommunity = useIsNsfwCommunity(communityAddress || '') && hideNsfwCommunities;

  const logoIsAvatar = isInCommunityView && suggested?.avatarUrl && !isHiddenNsfwCommunity;
  const logoSrc = logoIsAvatar ? suggested?.avatarUrl : 'assets/sprout/sprout.png';
  const logoLink = '/';

  const mobileSubmitButtonRoute =
    isInHomeView || isInHomeAboutView || isInAllView || isInModView || isInDomainView
      ? '/submit'
      : isInPendingPostView
        ? `/s/${accountComment?.subplebbitAddress}/submit`
        : communityAddress
          ? `/s/${communityAddress}/submit`
          : '/submit';

  return (
    <div className={styles.header}>
      <div
        className={`${styles.container} ${hasFewTabs && styles.reducedHeight} ${
          isInSubmitView && isInCommunitySubmitView && !isInCommunityView && isMobile && styles.reduceSubmitPageHeight
        } ${hasStickyHeader && styles.increasedHeight}`}
      >
        <div className={styles.logoContainer}>
          <Link to={logoLink} className={styles.logoLink}>
            {(logoIsAvatar || (!isInCommunityView && !isInProfileView && !isInAuthorView)) && (
              <img className={`${logoIsAvatar ? styles.avatar : styles.logo}`} src={logoSrc} alt='' />
            )}
            {((!isInCommunityView && !isInProfileView && !isInAuthorView) || !logoIsAvatar) && (
              <img src={`assets/sprout/seedit-text-${theme === 'dark' ? 'dark' : 'light'}.svg`} className={styles.logoText} alt='' />
            )}
          </Link>
        </div>
        {!isInHomeView && !isInHomeAboutView && !isInModView && !isInAllView && (
          <span className={`${styles.pageName} ${!logoIsAvatar && styles.soloPageName}`}>
            <HeaderTitle title={title} pendingPostCommunityAddress={accountComment?.subplebbitAddress} />
          </span>
        )}
        {(isInModView || isInAllView) && (
          <div className={`${styles.pageName} ${styles.allOrModPageName}`}>
            <HeaderTitle title={title} pendingPostCommunityAddress={accountComment?.subplebbitAddress} />
          </div>
        )}
        {!isMobile && !isHiddenNsfwCommunity && (
          <ul className={styles.tabMenu}>
            <HeaderTabs />
            {(isInHomeView || isInHomeAboutView) && <AboutButton />}
          </ul>
        )}
      </div>
      {isMobile && !isInCommunitySubmitView && !isHiddenNsfwCommunity && (
        <ul className={`${styles.tabMenu} ${isInProfileView ? styles.horizontalScroll : ''}`}>
          <HeaderTabs />
          {(isInHomeView || isInHomeAboutView || isInCommunityView || isInHomeAboutView || isInPostPageView) && <AboutButton />}
          {!isInSubmitView && !isInSettingsView && (
            <li>
              <Link to={mobileSubmitButtonRoute} className={styles.submitButton}>
                {t('submit')}
              </Link>
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export default Header;
