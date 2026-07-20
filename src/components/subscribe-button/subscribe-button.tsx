import { useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAccount, useSubscribe, type Account } from '@bitsocial/bitsocial-react-hooks';
import styles from './subscribe-button.module.css';
import { isAuthorView, isProfileView, isPendingPostView } from '../../lib/utils/view-utils';
import { persistStarterAccountUpdate } from '../../lib/utils/starter-account-persistence';
import { leaveStarterSubscription, type SeeditStarterSubscriptions } from '../../lib/utils/starter-subscriptions';
import { leaveDirectorySubscription, type SeeditDirectoryPreferences } from '../../lib/utils/directory-subscriptions';
import { joinDirectoryWinnerAccount } from '../../lib/utils/directory-account-transforms';
import type { SeeditDirectoryCode } from '../../lib/utils/directory-codes';

interface subscribeButtonProps {
  address: string | undefined;
  directoryCode?: SeeditDirectoryCode;
  directoryRevision?: number;
  onUnsubscribe?: (address: string) => void;
}

const SubscribeButton = ({ address, directoryCode, directoryRevision, onUnsubscribe }: subscribeButtonProps) => {
  const { subscribe, subscribed, unsubscribe } = useSubscribe({ communityAddress: address });
  const account = useAccount() as
    | (Account & { seeditDirectoryPreferences?: SeeditDirectoryPreferences; seeditStarterSubscriptions?: SeeditStarterSubscriptions })
    | undefined;
  const { t } = useTranslation();
  const location = useLocation();
  const params = useParams();
  const isInAuthorView = isAuthorView(location.pathname);
  const isInProfileView = isProfileView(location.pathname);
  const isInPendingPostView = isPendingPostView(location.pathname, params);
  const communityPageString = subscribed ? `${t('leave')}` : `${t('join')}`;
  const authorPageString = '+ friends'; // TODO: add functionality once implemented in backend

  const handleSubscribe = async () => {
    if (isInAuthorView) return; // TODO: remove once implemented in backend

    try {
      if (subscribed === false) {
        if (address && account && directoryCode && directoryRevision) {
          await persistStarterAccountUpdate(account.id, (currentAccount) => {
            return joinDirectoryWinnerAccount(currentAccount, {
              directoryCode,
              address,
              revision: directoryRevision,
              authoritative: true,
            });
          });
        } else {
          await subscribe();
        }
      } else if (subscribed === true) {
        if (address && account) {
          await persistStarterAccountUpdate(account.id, (currentAccount) => {
            const starterResult = leaveStarterSubscription({
              subscriptions: currentAccount.subscriptions ?? [],
              provenance: currentAccount.seeditStarterSubscriptions,
              address,
            });
            const directoryResult = leaveDirectorySubscription({
              subscriptions: starterResult.subscriptions,
              preferences: currentAccount.seeditDirectoryPreferences,
              address,
            });
            return {
              ...currentAccount,
              subscriptions: directoryResult.subscriptions,
              seeditDirectoryPreferences: directoryResult.preferences,
              ...(starterResult.provenance ? { seeditStarterSubscriptions: starterResult.provenance } : {}),
            };
          });
        } else {
          await unsubscribe();
        }
        if (onUnsubscribe && address) {
          onUnsubscribe(address);
        }
      }
    } catch (error) {
      console.error('Subscription update error:', error);
      alert(error instanceof Error ? error.message : t('failed'));
    }
  };

  return (
    <span
      className={`${isInProfileView && !isInPendingPostView ? styles.hidden : ''} ${styles.subscribeButton} ${subscribed ? styles.leaveButton : styles.joinButton}`}
      onClick={handleSubscribe}
    >
      {isInAuthorView ? authorPageString : communityPageString}
    </span>
  );
};

export default SubscribeButton;
