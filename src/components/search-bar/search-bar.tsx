import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { isHomeAboutView, isPostPageAboutView, isCommunityAboutView, isSearchView } from '../../lib/utils/view-utils';
import { getSearchNsfw, getSearchPath, getSearchQuery, SEARCH_COMMUNITY_PARAM, SEARCH_NSFW_PARAM } from '../../lib/utils/search-utils';
import { getShortDisplayAddress } from '../../lib/utils/address-utils';
import useResolvedCommunityRoute from '../../hooks/use-resolved-community-route';
import styles from './search-bar.module.css';

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
  const [searchParams] = useSearchParams();

  const isInHomeAboutView = isHomeAboutView(location.pathname);
  const isInPostPageAboutView = isPostPageAboutView(location.pathname, params);
  const isInCommunityAboutView = isCommunityAboutView(location.pathname, params);
  const isInSearchView = isSearchView(location.pathname);

  // A search already restricted to a community keeps its box ticked when the results page reloads.
  const restrictedCommunity = isInSearchView ? searchParams.get(SEARCH_COMMUNITY_PARAM) : null;
  const communityToRestrict = restrictedCommunity || currentCommunityAddress;

  // What the current route says the search is; the boxes and the input start from it.
  const routeQuery = isInSearchView ? getSearchQuery(searchParams.get('q')) : '';
  const routeNsfw = getSearchNsfw(searchParams.get(SEARCH_NSFW_PARAM));
  // Inside a community the search is limited to it by default, the way the results page opens it.
  const routeLimitToCommunity = Boolean(restrictedCommunity) || (!isInSearchView && Boolean(currentCommunityAddress));

  const [inputValue, setInputValue] = useState(routeQuery);
  const [nsfw, setNsfw] = useState(routeNsfw);
  const [limitToCommunity, setLimitToCommunity] = useState(routeLimitToCommunity);
  const [showExpando, setShowExpando] = useState(false);

  // The bar is editable, so the route is only re-applied when it actually changes.
  const routeState = `${routeQuery}|${routeNsfw}|${routeLimitToCommunity}`;
  const [lastRouteState, setLastRouteState] = useState(routeState);
  if (lastRouteState !== routeState) {
    setLastRouteState(routeState);
    setInputValue(routeQuery);
    setNsfw(routeNsfw);
    setLimitToCommunity(routeLimitToCommunity);
  }

  const searchBarRef = useRef<HTMLFormElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isFocused) searchInputRef.current?.focus();
  }, [isFocused]);

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setShowExpando(false);
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  useEffect(() => {
    onExpandoChange?.(showExpando);
  }, [showExpando, onExpandoChange]);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const searchInput = searchInputRef.current?.value.trim();
    if (!searchInput) return;
    setShowExpando(false);
    navigate(getSearchPath(searchInput, { community: limitToCommunity && communityToRestrict ? communityToRestrict : undefined, nsfw }));
  };

  return (
    <div ref={wrapperRef} className={`${styles.searchBarWrapper} ${isInHomeAboutView || isInCommunityAboutView || isInPostPageAboutView ? styles.mobileInfobar : ''}`}>
      <form className={styles.searchBar} ref={searchBarRef} onSubmit={handleSearchSubmit}>
        <input
          type='text'
          autoCorrect='off'
          autoComplete='off'
          spellCheck='false'
          autoCapitalize='off'
          placeholder={t('search')}
          ref={searchInputRef}
          onFocus={() => setShowExpando(true)}
          onChange={(event) => setInputValue(event.target.value)}
          value={inputValue}
        />
        <input type='submit' value='' />
      </form>
      <div className={`${styles.infobar} ${showExpando ? styles.slideDown : styles.slideUp} ${!communityToRestrict ? styles.lessHeight : ''}`}>
        {communityToRestrict && (
          <label>
            <input type='checkbox' checked={limitToCommunity} onChange={(event) => setLimitToCommunity(event.target.checked)} />
            {t('limit_my_search_to', { community: `s/${getShortDisplayAddress(communityToRestrict)}`, interpolation: { escapeValue: false } })}
          </label>
        )}
        <label>
          <input type='checkbox' checked={nsfw} onChange={(event) => setNsfw(event.target.checked)} />
          {t('include_nsfw_results')}
        </label>
      </div>
    </div>
  );
};

export default SearchBar;
