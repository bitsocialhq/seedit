import { useTranslation } from 'react-i18next';
import styles from './search-bar.module.css';

/**
 * The search parameters old.reddit documents under "advanced search", with its
 * `subreddit:` renamed to `community:`. Every one of these is parsed out of the
 * search box and sent to the indexer as a query parameter.
 */
const ADVANCED_SEARCH_PARAMS = [
  { descriptionKey: 'advanced_search_community', syntax: 'community:', value: 'community' },
  { descriptionKey: 'advanced_search_author', syntax: 'author:', value: 'username' },
  { descriptionKey: 'advanced_search_site', syntax: 'site:', value: 'example.com' },
  { descriptionKey: 'advanced_search_url', syntax: 'url:', value: 'text' },
  { descriptionKey: 'advanced_search_selftext', syntax: 'selftext:', value: 'text' },
  { descriptionKey: 'advanced_search_self', syntax: 'self:yes', value: '' },
  { descriptionKey: 'advanced_search_nsfw', syntax: 'nsfw:yes', value: '' },
] as const;

interface AdvancedSearchHelpProps {
  onCollapse: () => void;
}

const AdvancedSearchHelp = ({ onCollapse }: AdvancedSearchHelpProps) => {
  const { t } = useTranslation();

  return (
    <div className={styles.advancedSearch}>
      <div className={styles.advancedSearchIntro}>
        <span>{t('advanced_search_intro')}</span>
        <button aria-label={t('hide_help')} className={styles.advancedSearchCollapse} onClick={onCollapse} type='button'>
          [-]
        </button>
      </div>
      <dl className={styles.advancedSearchParams}>
        {ADVANCED_SEARCH_PARAMS.map(({ descriptionKey, syntax, value }) => (
          <div className={styles.advancedSearchParam} key={syntax}>
            <dt>
              {syntax}
              {value && <i>{value}</i>}
            </dt>
            <dd>{t(descriptionKey)}</dd>
          </div>
        ))}
      </dl>
      <p className={styles.advancedSearchExample}>
        {t('advanced_search_example')} <code>community:aww site:example.com dog</code>
      </p>
    </div>
  );
};

export default AdvancedSearchHelp;
