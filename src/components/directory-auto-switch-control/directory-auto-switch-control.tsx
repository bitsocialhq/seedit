import { useAccount, type Account } from '@bitsocial/bitsocial-react-hooks';
import { useTranslation } from 'react-i18next';
import type { SeeditDirectoryCode } from '../../lib/utils/directory-codes';
import type { SeeditDirectoryPreferences } from '../../lib/utils/directory-subscriptions';
import { persistStarterAccountUpdate } from '../../lib/utils/starter-account-persistence';
import { setDirectoryWinnerAutoSwitchAccount } from '../../lib/utils/directory-account-transforms';
import styles from './directory-auto-switch-control.module.css';

interface DirectoryAutoSwitchControlProps {
  address: string;
  directoryCode: SeeditDirectoryCode;
  directoryRevision: number;
}

const DirectoryAutoSwitchControl = ({ address, directoryCode, directoryRevision }: DirectoryAutoSwitchControlProps) => {
  const { t } = useTranslation();
  const account = useAccount() as (Account & { seeditDirectoryPreferences?: SeeditDirectoryPreferences }) | undefined;
  const isSubscribed = account?.subscriptions?.includes(address) ?? false;
  const slot = account?.seeditDirectoryPreferences?.slots?.[directoryCode];
  const enabled = slot?.subscriptionAddress === address && slot.autoSwitch;

  if (!account || !isSubscribed) return null;

  const handleChange = async (nextEnabled: boolean) => {
    try {
      await persistStarterAccountUpdate(account.id, (currentAccount) => {
        return setDirectoryWinnerAutoSwitchAccount(currentAccount, { directoryCode, address, revision: directoryRevision, authoritative: true }, nextEnabled);
      });
    } catch (error) {
      console.error('Directory automatic switching update error:', error);
      alert(error instanceof Error ? error.message : t('failed'));
    }
  };

  return (
    <label className={styles.control} title={t('directory_auto_switch_help')}>
      <input type='checkbox' checked={enabled} onChange={(event) => void handleChange(event.target.checked)} />
      {t('directory_auto_switch_label', { directoryCode })}
    </label>
  );
};

export default DirectoryAutoSwitchControl;
