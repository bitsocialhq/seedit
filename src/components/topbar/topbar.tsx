import { useEffect, useRef, useState, useMemo, memo } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAccount, useAccountCommunities } from '@bitsocial/bitsocial-react-hooks';
import { isAllView, isDomainView, isHomeView, isModView, isCommunityView } from '../../lib/utils/view-utils';
import getShortAddress from '../../lib/utils/address-utils';
import useContentOptionsStore from '../../stores/use-content-options-store';
import { useFilteredDefaultSubscriptions } from '../../hooks/use-default-subscriptions';
import { getCommunityPath, getCommunityRouteSegment, resolveCommunityRouteAddress } from '../../lib/utils/community-route-utils';
import useTimeFilter, { setSessionTimeFilterPreference } from '../../hooks/use-time-filter';
import { sortTypes } from '../../constants/sort-types';
import { sortLabels } from '../../constants/sort-labels';
import styles from './topbar.module.css';

const getSubscriptionDisplayName = (subscription: string) => {
  const routeSegment = getCommunityRouteSegment(subscription);
  if (routeSegment !== subscription) {
    return routeSegment;
  }
  const shortAddress = getShortAddress(subscription);
  return shortAddress.includes('.eth') ? shortAddress.slice(0, -4) : shortAddress.includes('.sol') ? shortAddress.slice(0, -4) : shortAddress;
};

const CommunitiesDropdown = () => {
  const { t } = useTranslation();
  const account = useAccount();
  const subscriptions = useMemo(() => account?.subscriptions, [account?.subscriptions]);
  const reversedSubscriptions = useMemo(() => (subscriptions ? [...subscriptions].reverse() : []), [subscriptions]);

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
        {reversedSubscriptions?.map((subscription: string) => (
          <Link key={subscription} to={getCommunityPath(subscription)} className={styles.dropdownItem}>
            {getSubscriptionDisplayName(subscription)}
          </Link>
        ))}
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
  const communityAddress = resolveCommunityRouteAddress(params.communityAddress);

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
  const communityAddress = resolveCommunityRouteAddress(params.communityAddress);

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
  const params = useParams();

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
  const filteredCommunityAddresses: string[] = [];
  for (const { address } of defaultCommunities) {
    if (!subscriptionSet.has(address)) filteredCommunityAddresses.push(address);
  }
  const activeCommunityAddress = resolveCommunityRouteAddress(params.communityAddress);

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
              const displayAddress = getSubscriptionDisplayName(subscription);
              return (
                <li key={subscription}>
                  {index !== 0 && <span className={styles.separator}>-</span>}
                  <Link to={getCommunityPath(subscription)} className={activeCommunityAddress === subscription ? styles.selected : styles.choice}>
                    {displayAddress}
                  </Link>
                </li>
              );
            })}
            {!hideDefaultCommunities && filteredCommunityAddresses?.length > 0 && <span className={styles.separator}> | </span>}
            {!hideDefaultCommunities &&
              filteredCommunityAddresses?.map((address, index) => {
                const displayAddress = getSubscriptionDisplayName(address);
                return (
                  <li key={address}>
                    {index !== 0 && <span className={styles.separator}>-</span>}
                    <Link to={getCommunityPath(address)} className={activeCommunityAddress === address ? styles.selected : styles.choice}>
                      {displayAddress}
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
