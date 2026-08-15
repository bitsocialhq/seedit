import { useTranslation } from 'react-i18next';
import useDevelopmentDebugStore from '../../../stores/use-development-debug-store';
import styles from './debug-settings.module.css';

const DebugSettings = () => {
  const { t } = useTranslation();
  const mockContentEnabled = useDevelopmentDebugStore((state) => state.mockContentEnabled);
  const setMockContentEnabled = useDevelopmentDebugStore((state) => state.setMockContentEnabled);
  const showFeedResetButton = useDevelopmentDebugStore((state) => state.showFeedResetButton);
  const setShowFeedResetButton = useDevelopmentDebugStore((state) => state.setShowFeedResetButton);

  const handleMockContentChange = (enabled: boolean) => {
    setMockContentEnabled(enabled);
    window.location.reload();
  };

  return (
    <div className={styles.content}>
      <div className={styles.category}>
        <span className={styles.categoryTitle}>{t('mock_content')}</span>
        <span className={styles.categorySettings}>
          <label>
            <input type='checkbox' checked={mockContentEnabled} onChange={(event) => handleMockContentChange(event.currentTarget.checked)} />
            {t('enable_mock_content_all_communities_reload')}
          </label>
          <div className={styles.settingDescription}>{t('mock_content_uncached_communities_description')}</div>
        </span>
      </div>
      <div className={styles.category}>
        <span className={styles.categoryTitle}>{t('reset_feed')}</span>
        <span className={styles.categorySettings}>
          <label>
            <input type='checkbox' checked={showFeedResetButton} onChange={(event) => setShowFeedResetButton(event.currentTarget.checked)} />
            {t('show_reset_feed_button')}
          </label>
        </span>
      </div>
    </div>
  );
};

export default DebugSettings;
