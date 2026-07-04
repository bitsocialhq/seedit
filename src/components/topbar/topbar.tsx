import { useEffect, useRef, useState, useMemo, memo } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAccount, useAccountCommunities } from '@bitsocial/bitsocial-react-hooks';
import { isAllView, isDomainView, isHomeView, isModView, isCommunityView } from '../../lib/utils/view-utils';
import getShortAddress from '../../lib/utils/address-utils';
import useContentOptionsStore from '../../stores/use-content-options-store';
import { useDefaultSubscriptions, useFilteredDefaultSubscriptions } from '../../hooks/use-default-subscriptions';
import { isDirectoryCode, isResolvableCommunityAddress } from '../../lib/utils/directory-codes';
import useTimeFilter, { setSessionTimeFilterPreference } from '../../hooks/use-time-filter';
import { sortTypes } from '../../constants/sort-types';
import { sortLabels } from '../../constants/sort-labels';
import { handleNSFWSubscriptionPrompt } from '../../lib/utils/nsfw-subscription-utils';
import styles from './topbar.module.css';

// Directory-code subscriptions (e.g. "memes") have no dot and are shorter than raw public
// keys, so getShortAddress would return an empty string for them; show the code itself.
const getSubscriptionDisplayName = (subscription: string) => {
  if (isDirectoryCode(subscription)) {
    return subscription;
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
        {reversedSubscriptions?.map((subscription: string, index: number) => (
          <Link key={index} to={`/s/${subscription}`} className={styles.dropdownItem}>
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

const TagFilterDropdown = () => {
  const { t } = useTranslation();
  const account = useAccount();
  const defaultCommunities = useDefaultSubscriptions();
  const {
    hideAdultCommunities,
    hideGoreCommunities,
    hideAntiCommunities,
    hideVulgarCommunities,
    setHideAdultCommunities,
    setHideGoreCommunities,
    setHideAntiCommunities,
    setHideVulgarCommunities,
  } = useContentOptionsStore();

  const tags = useMemo(
    () => [
      { name: 'adult', isHidden: hideAdultCommunities, setter: setHideAdultCommunities },
      { name: 'gore', isHidden: hideGoreCommunities, setter: setHideGoreCommunities },
      { name: 'vulgar', isHidden: hideVulgarCommunities, setter: setHideVulgarCommunities },
      { name: 'anti', isHidden: hideAntiCommunities, setter: setHideAntiCommunities },
    ],
    [
      hideAdultCommunities,
      hideGoreCommunities,
      hideAntiCommunities,
      hideVulgarCommunities,
      setHideAdultCommunities,
      setHideGoreCommunities,
      setHideAntiCommunities,
      setHideVulgarCommunities,
    ],
  );

  const [isTagFilterDropdownOpen, setIsTagFilterDropdownOpen] = useState(false);
  const toggleTagFilterDropdown = () => setIsTagFilterDropdownOpen(!isTagFilterDropdownOpen);
  const tagFilterDropdownRef = useRef<HTMLDivElement>(null);
  const tagFilterdropdownItemsRef = useRef<HTMLDivElement>(null);
  const tagFilterDropdownClass = isTagFilterDropdownOpen ? styles.visible : styles.hidden;

  const allHidden = hideAdultCommunities && hideGoreCommunities && hideAntiCommunities && hideVulgarCommunities;

  const handleToggleAll = async (event: React.MouseEvent) => {
    event.stopPropagation();
    const newState = !allHidden;

    if (!newState) {
      await handleNSFWSubscriptionPrompt({
        account,
        defaultCommunities,
        tagsToShow: ['adult', 'gore', 'anti', 'vulgar'],
        isShowingAll: true,
      });
    }

    setHideAdultCommunities(newState);
    setHideGoreCommunities(newState);
    setHideAntiCommunities(newState);
    setHideVulgarCommunities(newState);
  };

  const handleToggleTag = async (event: React.MouseEvent, setter: (hide: boolean) => void, currentState: boolean, tagName: string) => {
    event.stopPropagation();
    const newState = !currentState;

    if (!newState) {
      await handleNSFWSubscriptionPrompt({
        account,
        defaultCommunities,
        tagsToShow: [tagName],
      });
    }

    setter(newState);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tagFilterDropdownRef.current && !tagFilterDropdownRef.current.contains(event.target as Node)) {
        setIsTagFilterDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={styles.dropdown} ref={tagFilterDropdownRef} onClick={toggleTagFilterDropdown}>
      <span className={styles.selectedTitle}>{t('tags')}</span>
      <div className={`${styles.dropChoices} ${styles.filterDropChoices} ${tagFilterDropdownClass}`} ref={tagFilterdropdownItemsRef}>
        <div className={styles.dropdownItem} onClick={handleToggleAll} style={{ cursor: 'pointer' }}>
          <span className={styles.dropdownItemText}>{allHidden ? t('show_all_nsfw') : t('hide_all_nsfw')}</span>
        </div>
        {tags.map((tag, index) => (
          <div key={index} className={styles.dropdownItem} onClick={(e) => handleToggleTag(e, tag.setter, tag.isHidden, tag.name)} style={{ cursor: 'pointer' }}>
            <span className={styles.dropdownItemText}>
              {tag.isHidden ? t('show') : t('hide')} <i>{tag.name}</i>
            </span>
          </div>
        ))}
        <Link to='/settings/content-options' className={`${styles.dropdownItem} ${styles.myCommunitiesItemButtonDotted}`}>
          {t('content_options')}
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
          let dropdownLink = isInCommunityView ? `/s/${params.communityAddress}/${sortType}` : isinAllView ? `/s/all/${sortType}` : sortType;
          if (timeFilterName) {
            dropdownLink += `/${timeFilterName}`;
          }
          return (
            <Link to={dropdownLink} key={index} className={styles.dropdownItem}>
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

  const getTimeFilterLink = (timeFilterName: string) => {
    return isInCommunityView
      ? `/s/${params.communityAddress}/${selectedSortType}/${timeFilterName}`
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
            key={index}
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

  // Hide defaults the user already follows, either by direct address or via the
  // matching directory-code subscription (which resolves to the same community).
  const filteredCommunityAddresses = defaultCommunities.reduce<string[]>((addresses, defaultCommunity) => {
    if (
      !isResolvableCommunityAddress(defaultCommunity.address) ||
      subscriptions?.includes(defaultCommunity.address) ||
      (defaultCommunity.directoryCode && subscriptions?.includes(defaultCommunity.directoryCode))
    ) {
      return addresses;
    }

    addresses.push(defaultCommunity.address);
    return addresses;
  }, []);

  return (
    <div className={styles.headerArea}>
      <div className={styles.widthClip}>
        <CommunitiesDropdown />
        <TagFilterDropdown />
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
                <li key={index}>
                  {index !== 0 && <span className={styles.separator}>-</span>}
                  <Link to={`/s/${subscription}`} className={params.communityAddress === subscription ? styles.selected : styles.choice}>
                    {displayAddress}
                  </Link>
                </li>
              );
            })}
            {!hideDefaultCommunities && filteredCommunityAddresses?.length > 0 && <span className={styles.separator}> | </span>}
            {!hideDefaultCommunities &&
              filteredCommunityAddresses?.map((address, index) => {
                const shortAddress = getShortAddress(address);
                const displayAddress = shortAddress.includes('.eth')
                  ? shortAddress.slice(0, -4)
                  : shortAddress.includes('.sol')
                    ? shortAddress.slice(0, -4)
                    : shortAddress;
                return (
                  <li key={index}>
                    {index !== 0 && <span className={styles.separator}>-</span>}
                    <Link to={`/s/${address}`} className={params.communityAddress === address ? styles.selected : styles.choice}>
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
