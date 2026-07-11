import { useTranslation } from 'react-i18next';
import styles from './empty-feed-message.module.css';

const EmptyFeedMessage = () => {
  const { t } = useTranslation();

  return <div className={styles.message}>{t('nothing_found')}</div>;
};

export default EmptyFeedMessage;
