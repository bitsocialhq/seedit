import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStarterSubscriptions } from '../../hooks/use-starter-subscriptions';
import { getCommunityPath } from '../../lib/utils/community-route-utils';
import styles from './starter-subscriptions.module.css';

type StarterSubscriptionsState = ReturnType<typeof useStarterSubscriptions>;

interface StarterSubscriptionsReviewProps {
  initialSelectedAddresses: string[];
  state: StarterSubscriptionsState;
}

const StarterSubscriptionsReview = ({ initialSelectedAddresses, state }: StarterSubscriptionsReviewProps) => {
  const { t } = useTranslation();
  const { list, subscriptions, delta, loading, error, saveError, saving, canReview, addSelected, keepCurrent, replacePrevious } = state;
  const subscribedSet = new Set(subscriptions);
  const newAddressSet = new Set(delta.addedAddresses);
  const [selectedAddresses, setSelectedAddresses] = useState(() => new Set(initialSelectedAddresses));

  const toggleAddress = (address: string) => {
    setSelectedAddresses((current) => {
      const next = new Set(current);
      if (next.has(address)) next.delete(address);
      else next.add(address);
      return next;
    });
  };

  return (
    <main className={styles.page}>
      <title>{`${t('starter_communities')} - seedit`}</title>
      <div className={styles.infobar}>
        <h1>{t('starter_communities')}</h1>
        <p>{t('starter_communities_explanation')}</p>
        <p className={styles.revision}>{t('starter_list_revision', { revision: list.revision })}</p>
      </div>

      {error && <p className={styles.warning}>{t('starter_list_offline_fallback')}</p>}
      {saveError && (
        <p className={styles.warning} role='alert'>
          {t('failed')}: {saveError.message}
        </p>
      )}
      {delta.removedAddresses.length > 0 && (
        <section className={styles.removed}>
          <h2>{t('removed_starter_communities')}</h2>
          <ul>
            {delta.removedAddresses.map((address) => (
              <li key={address}>{address}</li>
            ))}
          </ul>
        </section>
      )}

      <div className={styles.list} aria-busy={loading}>
        {list.communities.map((community) => {
          const subscribed = subscribedSet.has(community.address);
          const isNew = newAddressSet.has(community.address);
          const selected = subscribed || selectedAddresses.has(community.address);
          return (
            <label className={styles.community} key={community.address}>
              <input type='checkbox' checked={selected} disabled={subscribed || saving} onChange={() => toggleAddress(community.address)} />
              <span>
                <Link to={getCommunityPath(community.address)}>{community.title || community.address}</Link>
                {isNew && <span className={styles.newLabel}>{t('new')}</span>}
                <small>s/{community.address}</small>
                {community.description && <span className={styles.description}>{community.description}</span>}
              </span>
            </label>
          );
        })}
      </div>

      <div className={styles.actions}>
        <button type='button' className={styles.primary} disabled={saving || loading || !canReview} onClick={() => void addSelected([...selectedAddresses])}>
          {saving ? t('saving') : t('add_selected_communities')}
        </button>
        <button type='button' disabled={saving || loading || !canReview} onClick={() => void keepCurrent()}>
          {t('keep_current_subscriptions')}
        </button>
        <button type='button' disabled={saving || loading || !canReview} onClick={() => void replacePrevious()}>
          {t('use_latest_starter_set')}
        </button>
      </div>
      <p className={styles.safety}>{t('starter_replacement_safety')}</p>
    </main>
  );
};

const StarterSubscriptions = () => {
  const state = useStarterSubscriptions();
  const subscribedSet = new Set(state.subscriptions);
  const initialSelectedAddresses = state.delta.addedAddresses.filter((address) => !subscribedSet.has(address));
  const selectionKey = JSON.stringify([state.list.revision, initialSelectedAddresses]);

  return <StarterSubscriptionsReview key={selectionKey} initialSelectedAddresses={initialSelectedAddresses} state={state} />;
};

export default StarterSubscriptions;
