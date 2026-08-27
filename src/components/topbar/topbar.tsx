import { useEffect, useRef, useState, useMemo, memo } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAccount, useAccountCommunities } from '@bitsocial/bitsocial-react-hooks';
import { isAllView, isDomainView, isHomeView, isModView, isCommunityView } from '../../lib/utils/view-utils';
import { getCompactCommunityDisplayName } from '../../lib/utils/address-utils';
import useContentOptionsStore from '../../stores/use-content-options-store';
import { useDefaultSubscriptions, useFilteredDefaultSubscriptions, type DefaultSubscription } from '../../hooks/use-default-subscriptions';
import { getCommunityPath, getDirectoryPath } from '../../lib/utils/community-route-utils';
import useTimeFilter, { setSessionTimeFilterPreference } from '../../hooks/use-time-filter';
import useResolvedCommunityRoute from '../../hooks/use-resolved-community-route';
import { sortTypes } from '../../constants/sort-types';
import { sortLabels } from '../../constants/sort-labels';
import styles from './topbar.module.css';

const getSubscriptionDisplayName = (subscription: string) => getCompactCommunityDisplayName(subscription);

const getTopbarCommunityLink = ({ address, directoryCode }: Pick<DefaultSubscription, 'address' | 'directoryCode'>) => ({
  displayName: directoryCode ?? getSubscriptionDisplayName(address),
  path: directoryCode ? getDirectoryPath(directoryCode) : getCommunityPath(address),
});

export const CommunitiesDropdown = () => {
  const { t } = useTranslation();
  const account = useAccount();
  const subscriptions = useMemo(() => account?.subscriptions, [account?.subscriptions]);
  const reversedSubscriptions = useMemo(() => (subscriptions ? [...subscriptions].reverse() : []), [subscriptions]);
  const defaultCommunities = useDefaultSubscriptions();
  const defaultCommunityByAddress = new Map(defaultCommunities.map((community) => [community.address, community]));

  const [isSubsDropdownOpen, setIsSubsDropdownOpen] = useState(false);
  const toggleSubsDropdown = () => setIsSubsDropdownOpen(!isSubsDropdownOpen);
  const subsDropdownRef = useRef<HTMLDivElement>(null);
  const subsdropdownItemsRef = useRef<HTMLDivElement>(null);
  const subsDropdownClass = isSubsDropdownOpen ? styles.visible : styles.hidden;

  useEffect(() => {
    if (!isSubsDropdownOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (subsDropdownRef.current && !subsDropdownRef.current.contains(event.target as Node)) {
        setIsSubsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSubsDropdownOpen]);

  return (
    <div className={`${styles.dropdown} ${styles.subsDropdown}`} ref={subsDropdownRef} onClick={toggleSubsDropdown}>
      <span className={styles.selectedTitle}>{t('my_communities')}</span>
      <div className={`${styles.dropChoices} ${styles.subsDropChoices} ${subsDropdownClass}`} ref={subsdropdownItemsRef}>
        {reversedSubscriptions?.map((subscription: string) => {
          const directoryCode = defaultCommunityByAddress.get(subscription)?.directoryCode;
          const { displayName, path } = getTopbarCommunityLink({ address: subscription, directoryCode });
          return (
            <Link key={subscription} to={path} className={styles.dropdownItem}>
              {displayName}
            </Link>
          );
        })}
        <Link to='/communities/subscriber' className={`${styles.dropdownItem} ${styles.myCommunitiesItemButtonDotted}`}>
          {t('edit_subscriptions')}
        </Link>
      </div>
    </div>
  );
};

const SortTypesDropdown = () => {
  const { t } = useTranslation();
  const params = useParams();
  const location = useLocation();
  const isInCommunityView = isCommunityView(location.pathname, params);
  const isinAllView = isAllView(location.pathname);
  const { timeFilterName } = useTimeFilter();

  const selectedSortType = params.sortType || 'hot';
  const { communityAddress } = useResolvedCommunityRoute();

  const getSelectedSortLabel = () => {
    const index = sortTypes.indexOf(selectedSortType);
    return index >= 0 ? sortLabels[index] : sortLabels[0];
  };

  const [isSortsDropdownOpen, setIsSortsDropdownOpen] = useState(false);
  const toggleSortsDropdown = () => setIsSortsDropdownOpen(!isSortsDropdownOpen);
  const sortsDropdownRef = useRef<HTMLDivElement>(null);
  const sortsdropdownItemsRef = useRef<HTMLDivElement>(null);
  const sortsDropdownClass = isSortsDropdownOpen ? styles.visible : styles.hidden;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortsDropdownRef.current && !sortsDropdownRef.current.contains(event.target as Node)) {
        setIsSortsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={styles.dropdown} ref={sortsDropdownRef} onClick={toggleSortsDropdown}>
      <span className={styles.selectedTitle}>{t(getSelectedSortLabel())}</span>
      <div className={`${styles.dropChoices} ${styles.sortsDropChoices} ${sortsDropdownClass}`} ref={sortsdropdownItemsRef}>
        {sortTypes.map((sortType, index) => {
          let dropdownLink = isInCommunityView && communityAddress ? `${getCommunityPath(communityAddress)}/${sortType}` : isinAllView ? `/s/all/${sortType}` : sortType;
          if (timeFilterName) {
            dropdownLink += `/${timeFilterName}`;
          }
          return (
            <Link to={dropdownLink} key={sortType} className={styles.dropdownItem}>
              {t(sortLabels[index])}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

const TimeFilterDropdown = () => {
  const params = useParams();
  const location = useLocation();
  const isInCommunityView = isCommunityView(location.pathname, params);
  const isInDomainView = isDomainView(location.pathname);
  const isinAllView = isAllView(location.pathname);
  const isInModView = isModView(location.pathname);
  const { timeFilterName, timeFilterNames, sessionKey } = useTimeFilter();
  const selectedTimeFilter = timeFilterName || (isInCommunityView ? 'all' : timeFilterName);

  const [isTimeFilterDropdownOpen, setIsTimeFilterDropdownOpen] = useState(false);
  const toggleTimeFilterDropdown = () => setIsTimeFilterDropdownOpen(!isTimeFilterDropdownOpen);
  const timeFilterDropdownRef = useRef<HTMLDivElement>(null);
  const timeFilterdropdownItemsRef = useRef<HTMLDivElement>(null);
  const timeFilterDropdownClass = isTimeFilterDropdownOpen ? styles.visible : styles.hidden;

  const selectedSortType = params.sortType || 'hot';
  const { communityAddress } = useResolvedCommunityRoute();

  const getTimeFilterLink = (timeFilterName: string) => {
    return isInCommunityView
      ? `${communityAddress ? getCommunityPath(communityAddress) : '/s'}/${selectedSortType}/${timeFilterName}`
      : isinAllView
        ? `s/all/${selectedSortType}/${timeFilterName}`
        : isInModView
          ? `/s/mod/${selectedSortType}/${timeFilterName}`
          : isInDomainView
            ? `/domain/${params.domain}/${selectedSortType}/${timeFilterName}`
            : `/${selectedSortType}/${timeFilterName}`;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (timeFilterDropdownRef.current && !timeFilterDropdownRef.current.contains(event.target as Node)) {
        setIsTimeFilterDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={styles.dropdown} ref={timeFilterDropdownRef} onClick={toggleTimeFilterDropdown}>
      <span className={styles.selectedTitle}>{selectedTimeFilter}</span>
      <div className={`${styles.dropChoices} ${styles.filterDropChoices} ${timeFilterDropdownClass}`} ref={timeFilterdropdownItemsRef}>
        {timeFilterNames.slice(0, -1).map((timeFilterName, index) => (
          <Link
            to={getTimeFilterLink(timeFilterName)}
            key={timeFilterName}
            className={styles.dropdownItem}
            onClick={() => setSessionTimeFilterPreference(sessionKey, timeFilterName)}
          >
            {timeFilterNames[index]}
          </Link>
        ))}
      </div>
    </div>
  );
};

const TopBar = memo(() => {
  const { t } = useTranslation();
  const location = useLocation();

  const isinAllView = isAllView(location.pathname);
  const isInHomeView = isHomeView(location.pathname);
  const isInModView = isModView(location.pathname);
  const homeButtonClass = isInHomeView ? styles.selected : styles.choice;

  const { hideDefaultCommunities } = useContentOptionsStore();
  const defaultCommunities = useFilteredDefaultSubscriptions();
  const { accountCommunities } = useAccountCommunities();
  const accountCommunityAddresses = useMemo(() => Object.keys(accountCommunities), [accountCommunities]);

  const account = useAccount();
  const subscriptions = useMemo(() => account?.subscriptions, [account?.subscriptions]);
  const reversedSubscriptions = useMemo(() => (subscriptions ? [...subscriptions].reverse() : []), [subscriptions]);

  const subscriptionSet = new Set(subscriptions ?? []);
  const defaultCommunityByAddress = new Map(defaultCommunities.map((community) => [community.address, community]));
  const filteredDefaultCommunities = defaultCommunities.filter(({ address }) => !subscriptionSet.has(address));
  const { communityAddress: activeCommunityAddress, directoryCode: activeDirectoryCode } = useResolvedCommunityRoute();

  return (
    <div className={styles.headerArea}>
      <div className={styles.widthClip}>
        <CommunitiesDropdown />
        <SortTypesDropdown />
        <TimeFilterDropdown />
        <div className={styles.srList}>
          <ul className={styles.srBar}>
            <li>
              <Link to='/' className={`${styles.homeButton} ${homeButtonClass}`}>
                {t('home')}
              </Link>
            </li>
            <li>
              <span className={styles.separator}>-</span>
              <Link to='/s/all' className={isinAllView ? styles.selected : styles.choice}>
                {t('all')}
              </Link>
            </li>
            {accountCommunityAddresses.length > 0 && (
              <li>
                <span className={styles.separator}>-</span>
                <Link to='/s/mod' className={isInModView ? styles.selected : styles.choice}>
                  {t('mod')}
                </Link>
              </li>
            )}
            {subscriptions?.length > 0 && <span className={styles.separator}> | </span>}
            {reversedSubscriptions?.map((subscription: string, index: number) => {
              const directoryCode = defaultCommunityByAddress.get(subscription)?.directoryCode;
              const { displayName, path } = getTopbarCommunityLink({ address: subscription, directoryCode });
              const isActive = directoryCode ? activeDirectoryCode === directoryCode : activeCommunityAddress === subscription;
              return (
                <li key={subscription}>
                  {index !== 0 && <span className={styles.separator}>-</span>}
                  <Link to={path} className={isActive ? styles.selected : styles.choice}>
                    {displayName}
                  </Link>
                </li>
              );
            })}
            {!hideDefaultCommunities && filteredDefaultCommunities.length > 0 && <span className={styles.separator}> | </span>}
            {!hideDefaultCommunities &&
              filteredDefaultCommunities.map(({ address, directoryCode }, index) => {
                const { displayName, path } = getTopbarCommunityLink({ address, directoryCode });
                const isActive = directoryCode ? activeDirectoryCode === directoryCode : activeCommunityAddress === address;
                return (
                  <li key={address}>
                    {index !== 0 && <span className={styles.separator}>-</span>}
                    <Link to={path} className={isActive ? styles.selected : styles.choice}>
                      {displayName}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
        <Link to='/communities/vote' className={styles.editLink}>
          {t('edit')} »
        </Link>
      </div>
    </div>
  );
});

export default TopBar;
