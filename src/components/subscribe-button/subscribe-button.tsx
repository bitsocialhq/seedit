import { useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAccount, useSubscribe, type Account } from '@bitsocial/bitsocial-react-hooks';
import styles from './subscribe-button.module.css';
import { isAuthorView, isProfileView, isPendingPostView } from '../../lib/utils/view-utils';
import { persistStarterAccountUpdate } from '../../lib/utils/starter-account-persistence';
import { leaveStarterSubscription, type SeeditStarterSubscriptions } from '../../lib/utils/starter-subscriptions';

interface subscribeButtonProps {
  address: string | undefined;
  onUnsubscribe?: (address: string) => void;
}

const SubscribeButton = ({ address, onUnsubscribe }: subscribeButtonProps) => {
  const { subscribe, subscribed, unsubscribe } = useSubscribe({ communityAddress: address });
  const account = useAccount() as (Account & { seeditStarterSubscriptions?: SeeditStarterSubscriptions }) | undefined;
  const { t } = useTranslation();
  const location = useLocation();
  const params = useParams();
  const isInAuthorView = isAuthorView(location.pathname);
  const isInProfileView = isProfileView(location.pathname);
  const isInPendingPostView = isPendingPostView(location.pathname, params);
  const subplebbitPageString = subscribed ? `${t('leave')}` : `${t('join')}`;
  const authorPageString = '+ friends'; // TODO: add functionality once implemented in backend

  const handleSubscribe = async () => {
    if (isInAuthorView) return; // TODO: remove once implemented in backend

    if (subscribed === false) {
      await subscribe();
    } else if (subscribed === true) {
      if (address && account) {
        await persistStarterAccountUpdate(account.id, (currentAccount) => {
          const { subscriptions, provenance } = leaveStarterSubscription({
            subscriptions: currentAccount.subscriptions ?? [],
            provenance: currentAccount.seeditStarterSubscriptions,
            address,
          });
          return provenance ? { ...currentAccount, subscriptions, seeditStarterSubscriptions: provenance } : { ...currentAccount, subscriptions };
        });
      } else {
        await unsubscribe();
      }
      if (onUnsubscribe && address) {
        onUnsubscribe(address);
      }
    }
  };

  return (
    <span
      className={`${isInProfileView && !isInPendingPostView ? styles.hidden : ''} ${styles.subscribeButton} ${subscribed ? styles.leaveButton : styles.joinButton}`}
      onClick={handleSubscribe}
    >
      {isInAuthorView ? authorPageString : subplebbitPageString}
    </span>
  );
};

export default SubscribeButton;
