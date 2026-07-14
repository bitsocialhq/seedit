import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStarterSubscriptions } from '../../hooks/use-starter-subscriptions';
import styles from './starter-subscriptions-notice.module.css';

const StarterSubscriptionsNotice = () => {
  const { t } = useTranslation();
  const { hasUpdate, delta } = useStarterSubscriptions();

  if (!hasUpdate) return null;

  return (
    <div className={styles.notice} role='status'>
      <strong>{t('starter_subscriptions_updated')}</strong>{' '}
      {t('starter_subscriptions_change_summary', {
        added: delta.addedAddresses.length,
        removed: delta.removedAddresses.length,
      })}{' '}
      <Link to='/communities/defaults'>{t('review_changes')}</Link>
    </div>
  );
};

export default StarterSubscriptionsNotice;
