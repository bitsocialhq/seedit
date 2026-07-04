import { Fragment, useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { Community as CommunityType, useAccount, useAccountCommunities, useCommunities, useCommunityStats } from '@bitsocial/bitsocial-react-hooks';
import styles from './communities.module.css';
import { getFormattedTimeDuration } from '../../lib/utils/time-utils';
import {
  isCommunitiesView,
  isCommunitiesSubscriberView,
  isCommunitiesModeratorView,
  isCommunitiesAdminView,
  isCommunitiesOwnerView,
  isCommunitiesVoteView,
  isCommunitiesVotePassingView,
  isCommunitiesVoteRejectingView,
} from '../../lib/utils/view-utils';
import useErrorStore from '../../stores/use-error-store';
import { getCommunityIdentifier, getCommunityIdentifiers } from '../../hooks/use-community-identifier';
import { useDefaultSubscriptionAddresses, useDefaultSubscriptions } from '../../hooks/use-default-subscriptions';
import { useDirectoryWinners } from '../../hooks/use-directory-winners';
import useDisplayedSubscriptions from '../../hooks/use-displayed-subscriptions';
import { isDirectoryCode, isResolvableCommunityAddress } from '../../lib/utils/directory-codes';
import useIsMobile from '../../hooks/use-is-mobile';
import useIsCommunityOffline from '../../hooks/use-is-community-offline';
import ErrorDisplay from '../../components/error-display';
import Markdown from '../../components/markdown';
import Label from '../../components/post/label';
import Sidebar from '../../components/sidebar';
import SubscribeButton from '../../components/subscribe-button';
import { nsfwTags } from '../../constants/nsfw-tags';
import _ from 'lodash';

interface SubplebbitProps {
  index?: number;
  subplebbit: CommunityType;
  tags?: string[];
  isUnsubscribed?: boolean;
  onUnsubscribe?: (address: string) => void;
  // Set when this row represents a directory subscription (e.g. "memes"): the row renders
  // as s/<code> and the subscribe button targets the code instead of the resolved address.
  directoryCode?: string;
}

interface ResolvedSubscriptionEntry {
  entry: string;
  directoryCode?: string;
  address?: string;
}

// Resolve a mixed list of subscription entries (directory codes + community addresses) to
// loadable communities. Directory codes resolve to their current winner's address; entries
// without a loadable address (e.g. placeholder candidates) get no community data.
const useResolvedSubscriptionEntries = (entries: string[]) => {
  const directoryCodes = useMemo(() => entries.filter((entry) => isDirectoryCode(entry)), [entries]);
  const { winnerAddressByCode } = useDirectoryWinners(directoryCodes);

  const resolvedEntries: ResolvedSubscriptionEntry[] = useMemo(
    () => entries.map((entry) => (isDirectoryCode(entry) ? { entry, directoryCode: entry, address: winnerAddressByCode[entry] } : { entry, address: entry })),
    [entries, winnerAddressByCode],
  );

  const loadableAddresses = useMemo(
    () => resolvedEntries.map(({ address }) => address).filter((address): address is string => isResolvableCommunityAddress(address)),
    [resolvedEntries],
  );

  const { communities, error } = useCommunities({ communities: getCommunityIdentifiers(loadableAddresses) });

  const communityByAddress = useMemo(() => {
    const byAddress: Record<string, CommunityType> = {};
    loadableAddresses.forEach((address, index) => {
      const community = communities?.[index];
      if (community) {
        byAddress[address] = community;
      }
    });
    return byAddress;
  }, [loadableAddresses, communities]);

  return { resolvedEntries, communityByAddress, error };
};

const NoCommunitiesMessage = () => {
  const { t } = useTranslation();
  return <div className={styles.noSubsMessage}>{t('nothing_found')}</div>;
};

const MyCommunitiesTabs = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const isInCommunitiesSubscriberView = isCommunitiesSubscriberView(location.pathname);
  const isInCommunitiesModeratorView = isCommunitiesModeratorView(location.pathname);
  const isInCommunitiesAdminView = isCommunitiesAdminView(location.pathname);
  const isInCommunitiesOwnerView = isCommunitiesOwnerView(location.pathname);
  const isInCommunitiesView =
    isCommunitiesView(location.pathname) && !isInCommunitiesSubscriberView && !isInCommunitiesModeratorView && !isInCommunitiesAdminView && !isInCommunitiesOwnerView;

  return (
    <div className={styles.communitiesTabs}>
      <Link to='/communities' className={isInCommunitiesView ? styles.selected : styles.choice}>
        {t('all')}
      </Link>
      <span className={styles.separator}>|</span>
      <Link to='/communities/subscriber' className={isInCommunitiesSubscriberView ? styles.selected : styles.choice}>
        {t('subscriber')}
      </Link>
      <span className={styles.separator}>|</span>
      <Link to='/communities/moderator' className={isInCommunitiesModeratorView ? styles.selected : styles.choice}>
        {t('moderator')}
      </Link>
      <span className={styles.separator}>|</span>
      <Link to='/communities/admin' className={isInCommunitiesAdminView ? styles.selected : styles.choice}>
        {t('admin')}
      </Link>
      <span className={styles.separator}>|</span>
      <Link to='/communities/owner' className={isInCommunitiesOwnerView ? styles.selected : styles.choice}>
        {t('owner')}
      </Link>
    </div>
  );
};

const VoteTabs = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const isInCommunitiesVoteView = isCommunitiesVoteView(location.pathname);
  const isInCommunitiesVotePassingView = isCommunitiesVotePassingView(location.pathname);
  const isInCommunitiesVoteRejectingView = isCommunitiesVoteRejectingView(location.pathname);

  return (
    <div className={styles.communitiesTabs}>
      <Link to='/communities/vote' className={isInCommunitiesVoteView ? styles.selected : styles.choice}>
        {t('all')}
      </Link>
      <span className={styles.separator}>|</span>
      <Link
        to='/communities/vote/passing'
        className={isInCommunitiesVotePassingView ? styles.selected : styles.choice}
        onClick={(e) => {
          e.preventDefault();
          alert('This feature is not available yet.');
        }}
        style={{ cursor: 'not-allowed' }}
      >
        {t('passing')}
      </Link>
      <span className={styles.separator}>|</span>
      <Link
        to='/communities/vote/rejecting'
        className={isInCommunitiesVoteRejectingView ? styles.selected : styles.choice}
        onClick={(e) => {
          e.preventDefault();
          alert('This feature is not available yet.');
        }}
        style={{ cursor: 'not-allowed' }}
      >
        {t('rejecting')}
      </Link>
    </div>
  );
};

const Infobar = () => {
  const account = useAccount();
  const { accountCommunities, error: accountCommunitiesError } = useAccountCommunities();
  const { setError } = useErrorStore();

  useEffect(() => {
    setError('Infobar_useAccountCommunities', accountCommunitiesError);
  }, [accountCommunitiesError, setError]);

  const subscriptions = account?.subscriptions || [];
  const { t } = useTranslation();
  const location = useLocation();

  const isInCommunitiesSubscriberView = isCommunitiesSubscriberView(location.pathname);
  const isInCommunitiesModeratorView = isCommunitiesModeratorView(location.pathname);
  const isInCommunitiesAdminView = isCommunitiesAdminView(location.pathname);
  const isInCommunitiesOwnerView = isCommunitiesOwnerView(location.pathname);

  // Check if we're filtering by any tag
  const urlParams = new URLSearchParams(location.search);
  const currentTag = urlParams.get('tag');

  // Get base path without search params
  const basePath = location.pathname;

  let mainInfobarText;
  if (isInCommunitiesSubscriberView) {
    mainInfobarText = subscriptions.length === 0 ? t('not_subscribed') : t('below_subscribed');
  } else if (isInCommunitiesModeratorView || isInCommunitiesAdminView || isInCommunitiesOwnerView) {
    mainInfobarText = Object.keys(accountCommunities).length > 0 ? t('below_moderator_access') : t('not_moderator');
  } else if (subscriptions.length === 0 && Object.keys(accountCommunities).length === 0) {
    mainInfobarText = t('not_subscriber_nor_moderator');
  } else {
    mainInfobarText = (
      <Trans i18nKey='join_communities_notice' values={{ join: t('join'), leave: t('leave') }} components={{ 1: <code key='join' />, 2: <code key='leave' /> }} />
    );
  }

  return (
    <>
      <div className={styles.infobar}>
        <div>{mainInfobarText}</div>
      </div>
      {currentTag && (
        <div className={styles.infobar}>
          {currentTag === 'nsfw' ? t('filtering_by_nsfw') + ' ("adult", "gore", "vulgar", "anti") —' : t('filtering_by_tag', { tag: currentTag }) + ' —'}{' '}
          <Link className={styles.undoLink} to={basePath}>
            {t('undo')}
          </Link>
        </div>
      )}
    </>
  );
};

const CommunityItem = ({ subplebbit, tags, index, isUnsubscribed, onUnsubscribe, directoryCode }: SubplebbitProps) => {
  const { t } = useTranslation();
  const { address, createdAt, description, roles, shortAddress, settings, suggested, title } = subplebbit || {};
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const showSprout = !suggested?.avatarUrl || avatarLoadFailed;
  const location = useLocation();

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [subplebbit?.address, suggested?.avatarUrl]);

  // subplebbit.settings is a private field that is only available to the owner of the subplebbit
  const isUserOwner = settings;
  const account = useAccount();
  const userRole = roles?.[account?.author?.address]?.role;

  const getTagFilterRoute = (tag: string) => {
    const pathname = location.pathname;
    return `${pathname}?tag=${encodeURIComponent(tag)}`;
  };

  // TODO: make arrows functional when token voting is implemented in the API
  const upvoted = false;
  const downvoted = false;
  const upvoteCount = 0;
  const downvoteCount = 0;

  const postScore = upvoteCount === 0 && downvoteCount === 0 ? '•' : upvoteCount - downvoteCount || '•';
  // Placeholder candidates of not-yet-populated directories are not loadable; skip stats.
  const canLoadCommunity = !!address && isResolvableCommunityAddress(address);
  const { allActiveUserCount } = useCommunityStats(canLoadCommunity ? { community: getCommunityIdentifier(address) } : undefined);
  const { isOffline, isOnlineStatusLoading, offlineTitle } = useIsCommunityOffline(subplebbit);

  const isNsfw = tags?.some((tag) => nsfwTags.includes(tag));

  const isMobile = useIsMobile();
  const descriptionText =
    description &&
    (isMobile
      ? description.length > 100
        ? description.slice(0, 100) + '...'
        : description
      : description.length > 400
        ? description.slice(0, 400) + '...'
        : description);

  return (
    <div className={`${styles.community} ${isUnsubscribed ? styles.unsubscribed : ''}`}>
      <div className={styles.row}>
        {!isMobile && <div className={styles.rank}>{(index ?? 0) + 1}</div>}
        <div className={styles.leftcol}>
          <div className={styles.midcol}>
            <div className={styles.arrowWrapper}>
              <div
                className={`${styles.arrowCommon} ${upvoted ? styles.upvoted : styles.arrowUp}`}
                style={{ cursor: 'not-allowed' }}
                onClick={(e) => {
                  e.preventDefault();
                  alert('This feature is not available yet.');
                }}
              />
            </div>
            <div className={styles.score}>{postScore}</div>
            <div className={styles.arrowWrapper}>
              <div
                className={`${styles.arrowCommon} ${downvoted ? styles.downvoted : styles.arrowDown}`}
                style={{ cursor: 'not-allowed' }}
                onClick={(e) => {
                  e.preventDefault();
                  alert('This feature is not available yet.');
                }}
              />
            </div>
          </div>
          <div className={`${styles.avatar} ${showSprout ? styles.defaultAvatar : ''}`}>
            <Link to={`/s/${directoryCode ?? address}`}>
              {suggested?.avatarUrl ? (
                <img
                  key={suggested.avatarUrl}
                  src={suggested.avatarUrl}
                  alt=''
                  className={styles.customAvatarImg}
                  onError={() => {
                    setAvatarLoadFailed(true);
                  }}
                />
              ) : (
                <img key='sprout' src={'assets/sprout/sprout.png'} alt='' className={styles.sproutImg} />
              )}
            </Link>
          </div>
        </div>
        <div className={styles.entry}>
          <div className={styles.title}>
            <div className={styles.titleWrapper}>
              <Link to={`/s/${directoryCode ?? address}`}>
                s/{directoryCode ?? (address?.includes('.') ? address : shortAddress)}
                {title && `: ${title}`}
              </Link>
              {directoryCode && <span className={styles.directoryMarker}>({t('directory')})</span>}
            </div>
          </div>
          {directoryCode && canLoadCommunity && (
            <div className={styles.directoryServedBy}>{t('directory_served_by', { community: address?.includes('.') ? address : shortAddress || address })}</div>
          )}
          <div className={styles.tagline}>
            {t('members_count', { count: allActiveUserCount })}, {t('community_for', { date: getFormattedTimeDuration(createdAt) })}
            <div className={styles.taglineSecondLine}>
              <span className={styles.subscribeButton}>
                <SubscribeButton address={directoryCode ?? address} onUnsubscribe={onUnsubscribe} />
              </span>
              {(userRole || isUserOwner) && (
                <Link to={`/s/${address}/settings`}>
                  <span className={`${styles.moderatorIcon} ${isNsfw ? styles.addMarginRight : ''}`} title={userRole || 'owner'} />
                </Link>
              )}
              {isNsfw && (
                <Link to={getTagFilterRoute('nsfw')}>
                  <span className={styles.over18icon} title='Filter NSFW communities' />
                </Link>
              )}
              {isOffline && !isOnlineStatusLoading && <Label color='red' title={offlineTitle} text={t('offline')} />}
              {tags && tags.length > 0 && (
                <span className={styles.tags}>
                  {tags.map((tag, index) => (
                    <Fragment key={index}>
                      <Link to={getTagFilterRoute(tag)}>{tag}</Link>
                    </Fragment>
                  ))}
                </span>
              )}
            </div>
          </div>
          {description && (
            <div className={styles.description}>
              <Markdown content={descriptionText} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AccountSubplebbits = ({ viewRole }: { viewRole: string }) => {
  const account = useAccount();
  const { accountCommunities, error: accountCommunitiesError } = useAccountCommunities();
  const { setError } = useErrorStore();
  const location = useLocation();
  const defaultCommunities = useDefaultSubscriptions();

  useEffect(() => {
    setError('AccountSubplebbits_useAccountCommunities', accountCommunitiesError);
  }, [accountCommunitiesError, setError, viewRole]);

  const urlParams = new URLSearchParams(location.search);
  const currentTag = urlParams.get('tag');

  const communityElements = Object.values(accountCommunities)
    .filter((community: any) => {
      const isUserOwner = community.settings !== undefined;
      const userRole = (community as any).roles?.[account?.author?.address]?.role;
      return isUserOwner || userRole === viewRole;
    })
    .filter((communityData: any) => {
      if (currentTag) {
        const tags = defaultCommunities.find((defaultSub) => defaultSub.address === (communityData as any).address)?.tags;

        if (currentTag === 'nsfw') {
          return tags?.some((tag) => nsfwTags.includes(tag));
        } else {
          return tags?.includes(currentTag);
        }
      }
      return true;
    })
    .map((communityData, index) => {
      const tags = defaultCommunities.find((defaultSub) => defaultSub.address === (communityData as any).address)?.tags;
      return <CommunityItem key={index} subplebbit={communityData} tags={tags} index={index} />;
    });

  if (communityElements.length === 0) {
    return <NoCommunitiesMessage />;
  }
  return <>{communityElements}</>;
};

const SubscriberSubplebbits = () => {
  const account = useAccount();
  const { setError } = useErrorStore();
  const location = useLocation();
  const defaultCommunities = useDefaultSubscriptions();

  const urlParams = new URLSearchParams(location.search);
  const currentTag = urlParams.get('tag');

  const getAccountSubscriptions = useCallback(() => {
    return account?.subscriptions ? [...account.subscriptions].reverse() : [];
  }, [account?.subscriptions]);

  const {
    list: displayedSubscriptions,
    isUnsubscribed,
    handleUnsubscribe,
  } = useDisplayedSubscriptions(
    getAccountSubscriptions,
    [account?.author?.address], // Reset dependencies
  );

  const { resolvedEntries, communityByAddress, error: communitiesError } = useResolvedSubscriptionEntries(displayedSubscriptions);

  useEffect(() => {
    setError('SubscriberSubplebbits_useCommunities', communitiesError);
  }, [communitiesError, setError]);

  const communityElements = resolvedEntries
    .filter(({ directoryCode, address }) => {
      const communityData = address ? communityByAddress[address] : undefined;
      // Directory subscriptions always render (even while their winner is unloadable) so
      // the user can still see and unsubscribe them; plain addresses wait for community data.
      if (!communityData && !directoryCode) return false;
      if (currentTag) {
        const tags = defaultCommunities.find((defaultSub) => defaultSub.address === address)?.tags;
        if (currentTag === 'nsfw') {
          return Boolean(tags?.some((tag) => nsfwTags.includes(tag)));
        }
        return Boolean(tags?.includes(currentTag));
      }
      return true;
    })
    .map(({ entry, directoryCode, address }, index) => {
      const communityData = address ? communityByAddress[address] : undefined;
      const subplebbit = communityData ?? ({ address: address ?? entry } as CommunityType);
      const tags = defaultCommunities.find((defaultSub) => defaultSub.address === address)?.tags;
      return (
        <CommunityItem
          key={entry}
          subplebbit={subplebbit}
          directoryCode={directoryCode}
          tags={tags}
          index={index}
          isUnsubscribed={isUnsubscribed(entry)}
          onUnsubscribe={handleUnsubscribe}
        />
      );
    });

  if (communityElements.length === 0) {
    return <NoCommunitiesMessage />;
  }
  return <>{communityElements}</>;
};

const AllDefaultSubplebbits = () => {
  const defaultCommunitiesList = useDefaultSubscriptions();
  const communityAddresses = useDefaultSubscriptionAddresses();
  const location = useLocation();

  const urlParams = new URLSearchParams(location.search);
  const currentTag = urlParams.get('tag');

  const { communities, error: communitiesError } = useCommunities({ communities: getCommunityIdentifiers(communityAddresses) });
  const { setError } = useErrorStore();

  useEffect(() => {
    setError('AllDefaultSubplebbits_useCommunities', communitiesError);
  }, [communitiesError, setError]);

  const communityElements = Object.values(communities ?? {})
    .filter((community): community is CommunityType => Boolean(community))
    .filter((communityData) => {
      if (currentTag) {
        const tags = defaultCommunitiesList.find((defaultSub) => defaultSub.address === (communityData as any).address)?.tags;

        if (currentTag === 'nsfw') {
          return tags?.some((tag) => nsfwTags.includes(tag));
        } else {
          return tags?.includes(currentTag);
        }
      }
      return true;
    })
    .map((communityData, index) => {
      const tags = defaultCommunitiesList.find((defaultSub) => defaultSub.address === (communityData as any).address)?.tags;
      return <CommunityItem key={communityData.address || index} subplebbit={communityData} tags={tags} index={index} />;
    });

  if (communityElements.length === 0) {
    return <NoCommunitiesMessage />;
  }
  return <>{communityElements}</>;
};

const AllAccountSubplebbits = () => {
  const account = useAccount();
  const { accountCommunities, error: accountCommunitiesError } = useAccountCommunities();
  const { setError } = useErrorStore();
  const location = useLocation();
  const defaultCommunities = useDefaultSubscriptions();

  useEffect(() => {
    setError('AllAccountSubplebbits_useAccountCommunities', accountCommunitiesError);
  }, [accountCommunitiesError, setError]);

  const urlParams = new URLSearchParams(location.search);
  const currentTag = urlParams.get('tag');

  const getAllAccountRelatedAddresses = useCallback(() => {
    const accountAddrs = Object.keys(accountCommunities);
    const subs = account?.subscriptions ? [...account.subscriptions].reverse() : [];
    return Array.from(new Set([...accountAddrs, ...subs]));
  }, [accountCommunities, account?.subscriptions]);

  const { list: displayedAddresses, isUnsubscribed, handleUnsubscribe } = useDisplayedSubscriptions(getAllAccountRelatedAddresses, [account?.author?.address]);

  const { resolvedEntries, communityByAddress, error: communitiesError } = useResolvedSubscriptionEntries(displayedAddresses);

  useEffect(() => {
    setError('AllAccountSubplebbits_useCommunities', communitiesError);
  }, [communitiesError, setError]);

  const communityElements = resolvedEntries
    .filter(({ directoryCode, address }) => {
      const communityData = address ? communityByAddress[address] : undefined;
      if (!communityData && !directoryCode) return false;
      if (currentTag) {
        const tags = defaultCommunities.find((defaultSub) => defaultSub.address === address)?.tags;
        if (currentTag === 'nsfw') {
          return Boolean(tags?.some((tag) => nsfwTags.includes(tag)));
        }
        return Boolean(tags?.includes(currentTag));
      }
      return true;
    })
    .map(({ entry, directoryCode, address }, index) => {
      const communityData = address ? communityByAddress[address] : undefined;
      const subplebbit = communityData ?? ({ address: address ?? entry } as CommunityType);
      const tags = defaultCommunities.find((defaultSub) => defaultSub.address === address)?.tags;
      return (
        <CommunityItem
          key={entry}
          subplebbit={subplebbit}
          directoryCode={directoryCode}
          tags={tags}
          index={index}
          isUnsubscribed={isUnsubscribed(entry)}
          onUnsubscribe={handleUnsubscribe}
        />
      );
    });

  if (communityElements.length === 0) {
    return <NoCommunitiesMessage />;
  }
  return <>{communityElements}</>;
};

const Communities = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { errors, clearAllErrors } = useErrorStore();

  useEffect(() => {
    return () => {
      clearAllErrors();
    };
  }, [location, clearAllErrors]);

  useEffect(() => {
    Object.entries(errors).forEach(([source, errorObj]) => {
      if (errorObj) {
        console.error(`Error from ${source}:`, errorObj.message, errorObj.stack);
      }
    });
  }, [errors]);

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

  let viewRole = 'subscriber';
  if (isInCommunitiesModeratorView) {
    viewRole = 'moderator';
  } else if (isInCommunitiesAdminView) {
    viewRole = 'admin';
  } else if (isInCommunitiesOwnerView) {
    viewRole = 'owner';
  }

  const documentTitle = useMemo(() => {
    let title = t('communities').charAt(0).toUpperCase() + t('communities').slice(1);
    if (isInCommunitiesVoteView) {
      title += ` - ${_.startCase(t('vote'))}`;
    } else if (isInCommunitiesSubscriberView) {
      title += ` - ${_.startCase(t('subscriber'))}`;
    } else if (isInCommunitiesModeratorView) {
      title += ` - ${_.startCase(t('moderator'))}`;
    } else if (isInCommunitiesAdminView) {
      title += ` - ${_.startCase(t('admin'))}`;
    } else if (isInCommunitiesOwnerView) {
      title += ` - ${_.startCase(t('owner'))}`;
    } else if (isInCommunitiesView) {
      title += ` - ${_.startCase(t('all'))}`;
    }
    return `${title} - Seedit`;
  }, [isInCommunitiesSubscriberView, isInCommunitiesModeratorView, isInCommunitiesAdminView, isInCommunitiesOwnerView, isInCommunitiesView, isInCommunitiesVoteView, t]);

  useEffect(() => {
    document.title = documentTitle;
  }, [documentTitle]);

  const renderErrors = () => {
    const errorsToDisplay: React.JSX.Element[] = [];
    Object.entries(errors).forEach(([source, errorObj]) => {
      if (!errorObj) return;

      if (
        source === 'Infobar_useAccountCommunities' &&
        (isInCommunitiesView || isInCommunitiesSubscriberView || isInCommunitiesModeratorView || isInCommunitiesAdminView || isInCommunitiesOwnerView)
      ) {
        errorsToDisplay.push(<ErrorDisplay key={source} error={errorObj} />);
      } else if (source === 'AccountSubplebbits_useAccountCommunities' && (isInCommunitiesModeratorView || isInCommunitiesAdminView || isInCommunitiesOwnerView)) {
        errorsToDisplay.push(<ErrorDisplay key={source} error={errorObj} />);
      } else if (source === 'SubscriberSubplebbits_useCommunities' && isInCommunitiesSubscriberView) {
        errorsToDisplay.push(<ErrorDisplay key={source} error={errorObj} />);
      } else if (source === 'AllDefaultSubplebbits_useCommunities' && isInCommunitiesVoteView) {
        errorsToDisplay.push(<ErrorDisplay key={source} error={errorObj} />);
      } else if (source === 'AllAccountSubplebbits_useAccountCommunities' && isInCommunitiesView) {
        errorsToDisplay.push(<ErrorDisplay key={source} error={errorObj} />);
      } else if (source === 'AllAccountSubplebbits_useCommunities' && isInCommunitiesView) {
        errorsToDisplay.push(<ErrorDisplay key={`${source}_communities`} error={errorObj} />);
      }
    });
    return errorsToDisplay;
  };

  return (
    <div className={styles.content}>
      <div className={styles.sidebar}>
        <Sidebar />
      </div>
      {isInCommunitiesSubscriberView || isInCommunitiesModeratorView || isInCommunitiesAdminView || isInCommunitiesOwnerView || isInCommunitiesView ? (
        <MyCommunitiesTabs />
      ) : (
        <VoteTabs />
      )}
      <Infobar />
      <div className={styles.error}>{renderErrors()}</div>
      {isInCommunitiesVoteView && <AllDefaultSubplebbits />}
      {(isInCommunitiesModeratorView || isInCommunitiesAdminView || isInCommunitiesOwnerView) && <AccountSubplebbits viewRole={viewRole} />}
      {isInCommunitiesSubscriberView && <SubscriberSubplebbits />}
      {isInCommunitiesView && <AllAccountSubplebbits />}
    </div>
  );
};

export default Communities;
