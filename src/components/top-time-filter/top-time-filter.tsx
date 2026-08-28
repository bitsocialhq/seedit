import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { setSessionTimeFilterPreference, topTimeFilterNames } from '../../hooks/use-time-filter';
import { getTopTimeFilterPath } from '../../lib/utils/time-filter-utils';
import styles from './top-time-filter.module.css';

const labelKeys: Record<string, string> = {
  '1h': 'past_hour',
  '24h': 'past_24_hours',
  '1w': 'past_week',
  '1m': 'past_month',
  '1y': 'past_year',
  all: 'all_time',
};

interface TopTimeFilterProps {
  selectedTimeFilterName: string;
  sessionKey: string | null;
}

const TopTimeFilter = ({ selectedTimeFilterName, sessionKey }: TopTimeFilterProps) => {
  const { t } = useTranslation();
  const location = useLocation();
  const params = useParams<{ timeFilterName?: string }>();
  const selectedName = topTimeFilterNames.includes(selectedTimeFilterName) ? selectedTimeFilterName : 'all';

  return (
    <div className={styles.menuArea}>
      <span>{t('links_from')}:</span>
      <details className={styles.dropdown}>
        <summary>{t(labelKeys[selectedName])}</summary>
        <div className={styles.dropChoices}>
          {topTimeFilterNames
            .filter((timeFilterName) => timeFilterName !== selectedName)
            .map((timeFilterName) => (
              <Link
                key={timeFilterName}
                to={getTopTimeFilterPath(location.pathname, params.timeFilterName, timeFilterName, location.search)}
                onClick={(event) => {
                  setSessionTimeFilterPreference(sessionKey, timeFilterName);
                  event.currentTarget.closest('details')?.removeAttribute('open');
                }}
              >
                {t(labelKeys[timeFilterName])}
              </Link>
            ))}
        </div>
      </details>
    </div>
  );
};

export default TopTimeFilter;
