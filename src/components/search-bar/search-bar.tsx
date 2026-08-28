import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFloating, autoUpdate, offset, shift, FloatingPortal } from '@floating-ui/react';
import { useAccount } from '@bitsocial/bitsocial-react-hooks';
import {
  isHomeView,
  isHomeAboutView,
  isPostPageView,
  isPostPageAboutView,
  isCommunityView,
  isAllView,
  isModView,
  isCommunityAboutView,
  isSearchView,
} from '../../lib/utils/view-utils';
import { getSearchPath } from '../../lib/utils/search-utils';
import { getShortDisplayAddress } from '../../lib/utils/address-utils';
import useFeedFiltersStore from '../../stores/use-feed-filters-store';
import { useDefaultSubscriptionAddresses } from '../../hooks/use-default-subscriptions';
import useResolvedCommunityRoute from '../../hooks/use-resolved-community-route';
import styles from './search-bar.module.css';
import _ from 'lodash';
import { getCommunityPath, getCommunityReferencePath, resolveCommunityRouteAddress } from '../../lib/utils/community-route-utils';

interface SearchBarProps {
  isFocused?: boolean;
  onExpandoChange?: (expanded: boolean) => void;
}

const SearchBar = ({ isFocused = false, onExpandoChange }: SearchBarProps) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const { communityAddress: currentCommunityAddress } = useResolvedCommunityRoute();
  const [searchParams, setSearchParams] = useSearchParams();

  const isInHomeAboutView = isHomeAboutView(location.pathname);
  const isInPostPageAboutView = isPostPageAboutView(location.pathname, params);
  const isInCommunityView = isCommunityView(location.pathname, params);
  const isInCommunityAboutView = isCommunityAboutView(location.pathname, params);
  const isInHomeView = isHomeView(location.pathname);
  const isInPostPageView = isPostPageView(location.pathname, params);
  const isInAllView = isAllView(location.pathname);
  const isInModView = isModView(location.pathname);
  const isInSearchView = isSearchView(location.pathname);

  const isInFeedView = (isInCommunityView || isInHomeView || isInAllView || isInModView) && !isInPostPageView;

  const currentQuery = searchParams.get('q') || '';
  // archive search queries the seeditarchive indexer for posts across all communities
  const [isArchiveSearch, setIsArchiveSearch] = useState(isInSearchView);
  const [isInCommunitySearch, setIsInCommunitySearch] = useState(() => {
    if (isInSearchView) return false;
    if (currentQuery) return true;
    if (isInFeedView) return false;
    return false; // always default to 'go to a community' in non-feed views
  });
  const placeholder = isArchiveSearch ? t('search_all_posts') : isInCommunitySearch && isInFeedView ? t('search_posts') : t('enter_community_address');
  const [showExpando, setShowExpando] = useState(false);

  const searchBarRef = useRef<HTMLFormElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [inputValue, setInputValue] = useState(currentQuery);
  const { setIsSearching } = useFeedFiltersStore();

  const account = useAccount();
  const communityAddresses = useMemo(() => account?.subscriptions || [], [account?.subscriptions]);
  const defaultCommunityAddresses = useDefaultSubscriptionAddresses();
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [activeDropdownIndex, setActiveDropdownIndex] = useState<number>(-1);

  const filteredCommunitySuggestions = useMemo(() => {
    if (!inputValue || isInCommunitySearch || isArchiveSearch) return [];
    const combinedAddresses = Array.from(new Set([...communityAddresses, ...defaultCommunityAddresses]));
    return combinedAddresses.filter((address: string) => address?.toLowerCase()?.includes(inputValue.toLowerCase())).slice(0, 10);
  }, [inputValue, communityAddresses, defaultCommunityAddresses, isInCommunitySearch, isArchiveSearch]);

  const { x, y, strategy, refs, context } = useFloating({
    open: isInputFocused && filteredCommunitySuggestions.length > 0,
    onOpenChange: (open) => {
      if (!open) {
        setIsInputFocused(false);
      }
    },
    middleware: [offset(5), shift()],
    whileElementsMounted: autoUpdate,
  });
  const setFloatingReferenceRef = useRef(refs.setReference);
  setFloatingReferenceRef.current = refs.setReference;
  const setSearchInputReference = useCallback((instance: HTMLInputElement | null) => {
    searchInputRef.current = instance;
    setFloatingReferenceRef.current(instance);
  }, []);

  useEffect(() => {
    setInputValue(searchParams.get('q') || '');
  }, [searchParams]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSetSearchQuery = useCallback(
    _.debounce((query: string) => {
      if (isInCommunitySearch) {
        setSearchParams((prev) => {
          if (query.trim()) {
            prev.set('q', query.trim());
          } else {
            prev.delete('q');
          }
          return prev;
        });
        setIsSearching(false);
      }
    }, 300),
    [setSearchParams, setIsSearching, isInCommunitySearch],
  );

  useEffect(() => {
    if (isInSearchView) {
      setIsArchiveSearch(true);
      setIsInCommunitySearch(false);
    } else if (searchParams.get('q')) {
      setIsInCommunitySearch(true);
      setIsArchiveSearch(false);
    } else if (!isInFeedView) {
      setIsInCommunitySearch(false);
    }
  }, [searchParams, isInFeedView, isInSearchView]);

  useEffect(() => {
    if (isFocused) {
      searchInputRef.current?.focus();
    }
  }, [isFocused]);

  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowExpando(false);
      }
    },
    [wrapperRef],
  );

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutside]);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isArchiveSearch) {
      const searchInput = searchInputRef.current?.value.trim();
      if (searchInput) {
        setShowExpando(false);
        navigate(getSearchPath(searchInput));
      }
      return;
    }
    if (isInCommunitySearch) {
      debouncedSetSearchQuery.flush();
      return;
    }
    const searchInput = searchInputRef.current?.value.trim();
    if (searchInput) {
      const communityAddress = resolveCommunityRouteAddress(searchInput);
      if (!communityAddress) return;
      const isCurrentDirectoryRoute = params.communityAddress?.toLowerCase() === searchInput.toLowerCase();
      if (isCurrentDirectoryRoute || communityAddress.toLowerCase() === currentCommunityAddress?.toLowerCase()) {
        alert(t('already_in_community'));
        return;
      }
      setInputValue('');
      navigate(getCommunityReferencePath(searchInput));
    }
  };

  useEffect(() => {
    onExpandoChange?.(showExpando);
  }, [showExpando, onExpandoChange]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setActiveDropdownIndex(-1);
    if (isInCommunitySearch) {
      if (value.trim()) {
        setIsSearching(true);
      }
      debouncedSetSearchQuery(value);
    }
  };

  const handleArchiveSearchToggle = () => {
    setIsArchiveSearch(true);
    setIsInCommunitySearch(false);
    searchInputRef.current?.focus();
    setShowExpando(true);
  };

  const handleCommunitySearchToggle = (shouldSearchCommunity: boolean) => {
    setIsArchiveSearch(false);
    setIsInCommunitySearch(shouldSearchCommunity);
    if (!shouldSearchCommunity) {
      setInputValue('');
      setIsSearching(false);
      setSearchParams((prev) => {
        prev.delete('q');
        return prev;
      });
    } else {
      searchInputRef.current?.focus();
      setShowExpando(true);
    }
  };

  const handleCommunitySelect = useCallback(
    (address: string) => {
      if (address.toLowerCase() === currentCommunityAddress?.toLowerCase()) {
        alert(t('already_in_community'));
        return;
      }
      setInputValue('');
      setIsInputFocused(false);
      setActiveDropdownIndex(-1);
      setShowExpando(false);
      searchInputRef.current?.blur();
      navigate(getCommunityPath(address));
    },
    [currentCommunityAddress, navigate, setInputValue, setIsInputFocused, setActiveDropdownIndex, t],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isInputFocused || isInCommunitySearch || filteredCommunitySuggestions.length === 0) {
        if (e.key === 'Enter' && !isInCommunitySearch) {
        } else {
          return;
        }
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveDropdownIndex((prevIndex) => (prevIndex < filteredCommunitySuggestions.length - 1 ? prevIndex + 1 : prevIndex));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveDropdownIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeDropdownIndex !== -1 && filteredCommunitySuggestions[activeDropdownIndex]) {
          handleCommunitySelect(filteredCommunitySuggestions[activeDropdownIndex]);
        } else if (inputValue.trim() && !isInCommunitySearch) {
          searchBarRef.current?.requestSubmit();
        }
      } else if (e.key === 'Escape') {
        setIsInputFocused(false);
        setActiveDropdownIndex(-1);
      }
    },
    [isInputFocused, isInCommunitySearch, filteredCommunitySuggestions, activeDropdownIndex, handleCommunitySelect, inputValue],
  );

  return (
    <div ref={wrapperRef} className={`${styles.searchBarWrapper} ${isInHomeAboutView || isInCommunityAboutView || isInPostPageAboutView ? styles.mobileInfobar : ''}`}>
      <form className={styles.searchBar} ref={searchBarRef} onSubmit={handleSearchSubmit}>
        <input
          type='text'
          autoCorrect='off'
          autoComplete='off'
          spellCheck='false'
          autoCapitalize='off'
          placeholder={placeholder}
          ref={setSearchInputReference}
          onFocus={() => {
            setShowExpando(true);
            setIsInputFocused(true);
          }}
          onChange={handleSearchChange}
          value={inputValue}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setIsInputFocused(false), 150)}
        />
        <input type='submit' value='' />
      </form>
      {context.open && (
        <FloatingPortal>
          <ul
            ref={refs.setFloating}
            style={{
              position: strategy,
              top: y ?? 0,
              left: x ?? 0,
              width: searchInputRef.current?.offsetWidth ? searchInputRef.current.offsetWidth - 2 : 'auto', // -2 for border
            }}
            className={styles.dropdown}
          >
            {filteredCommunitySuggestions.map((address: string, index: number) => (
              <li
                key={address}
                className={`${styles.dropdownItem} ${index === activeDropdownIndex ? styles.activeDropdownItem : ''}`}
                onClick={() => handleCommunitySelect(address)}
                onTouchEnd={() => handleCommunitySelect(address)}
                onMouseEnter={() => setActiveDropdownIndex(index)}
              >
                {getShortDisplayAddress(address)}
              </li>
            ))}
          </ul>
        </FloatingPortal>
      )}
      <div className={`${styles.infobar} ${showExpando ? styles.slideDown : styles.slideUp} ${!isInFeedView ? styles.lessHeight : ''}`}>
        <label>
          <input type='checkbox' checked={!isArchiveSearch && (!isInCommunitySearch || !isInFeedView)} onChange={() => handleCommunitySearchToggle(false)} />
          {t('go_to_a_community')}
        </label>
        {isInFeedView && (
          <label>
            <input type='checkbox' checked={isInCommunitySearch && !isArchiveSearch} onChange={() => handleCommunitySearchToggle(true)} />
            {t('search_feed_post')}
          </label>
        )}
        <label>
          <input type='checkbox' checked={isArchiveSearch} onChange={handleArchiveSearchToggle} />
          {t('search_all_posts')}
        </label>
      </div>
    </div>
  );
};

export default SearchBar;
