import { useTranslation } from 'react-i18next';
import useDevelopmentDebugStore from '../../stores/use-development-debug-store';
import styles from './development-feed-reset-button.module.css';

interface DevelopmentFeedResetButtonProps {
  onReset: () => void;
}

const DevelopmentFeedResetButton = ({ onReset }: DevelopmentFeedResetButtonProps) => {
  const { t } = useTranslation();
  const showFeedResetButton = useDevelopmentDebugStore((state) => state.showFeedResetButton);

  if (!import.meta.env.DEV || !showFeedResetButton) return null;

  return (
    <button type='button' className={styles.resetButton} onClick={onReset}>
      {t('reset_feed')}
    </button>
  );
};

export default DevelopmentFeedResetButton;
