import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAccount } from '@bitsocial/bitsocial-react-hooks';
import { useStarterSubscriptions } from '../../hooks/use-starter-subscriptions';
import type { StarterAccount } from '../../lib/utils/starter-account';
import styles from './starter-subscriptions-notice.module.css';

const StarterSubscriptionsNotice = () => {
  const { t } = useTranslation();
  const account = useAccount() as StarterAccount | undefined;
  const { hasUpdate, delta } = useStarterSubscriptions();

  if (!hasUpdate) return null;

  const directoryPreferences = account?.seeditDirectoryPreferences;
  // Only a persisted automatic transition proves that the independently fetched directory
  // snapshot covers this default-list delta. Manual directory prompts are derived at render
  // time, so the generic notice remains as a safe fallback until the user acts.
  const automaticNotices = Object.values(directoryPreferences?.automaticChangeNotices ?? {}).filter((notice): notice is NonNullable<typeof notice> => Boolean(notice));
  const coveredAddedAddresses = new Set(automaticNotices.map(({ toAddress }) => toAddress));
  const coveredRemovedAddresses = new Set(automaticNotices.map(({ fromAddress }) => fromAddress));
  const uncoveredAddedAddresses = delta.addedAddresses.filter((address) => !coveredAddedAddresses.has(address));
  const uncoveredRemovedAddresses = delta.removedAddresses.filter((address) => !coveredRemovedAddresses.has(address));
  const hasUncoveredChange = uncoveredAddedAddresses.length > 0 || uncoveredRemovedAddresses.length > 0;

  if (!hasUncoveredChange) return null;

  return (
    <output className={styles.notice}>
      <strong>{t('starter_subscriptions_updated')}</strong>{' '}
      {t('starter_subscriptions_change_summary', {
        added: uncoveredAddedAddresses.length,
        removed: uncoveredRemovedAddresses.length,
      })}{' '}
      <Link to='/communities/defaults'>{t('review_changes')}</Link>
    </output>
  );
};

export default StarterSubscriptionsNotice;
