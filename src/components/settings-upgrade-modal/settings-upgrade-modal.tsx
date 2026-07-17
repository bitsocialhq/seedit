import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { setAccount, useAccount, usePkcRpcSettings } from '@bitsocial/bitsocial-react-hooks';
import { useTranslation } from 'react-i18next';
import {
  applySelectedSettingsUpgrades,
  getReviewableSettingsUpgrades,
  getSelectedSettingsUpgradeOptionCount,
  getSettingsUpgradeKey,
  getSettingsUpgradeOptionSelectionKey,
  isSettingsUpgradeOptionSelected,
  type ReviewableSettingsUpgrade,
  type SettingsUpgradeAccount,
  type SettingsUpgradeSelections,
} from '../../lib/settings-upgrades';
import useSettingsUpgradeReviewStore from '../../stores/use-settings-upgrade-review-store';
import styles from './settings-upgrade-modal.module.css';

const SettingsUpgradeModalContent = ({
  account,
  allowPermanentHide,
  dismissUpgrades,
  hideUpgrades,
  upgradeKeys,
  upgrades,
}: {
  account: SettingsUpgradeAccount;
  allowPermanentHide: boolean;
  dismissUpgrades: (upgradeKeys: string[], persist: boolean) => void;
  hideUpgrades: (upgradeKeys: string[]) => void;
  upgradeKeys: string[];
  upgrades: ReviewableSettingsUpgrade[];
}) => {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const initialFocusRef = useRef<HTMLInputElement>(null);
  const [upgradeSelections, setUpgradeSelections] = useState<SettingsUpgradeSelections>({});
  const selectedUpgradeOptionCount = getSelectedSettingsUpgradeOptionCount(upgrades, upgradeSelections);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previouslyFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog) return;

    dialog.showModal();
    initialFocusRef.current?.focus();

    return () => {
      if (dialog.open) dialog.close();
      previouslyFocusedElement?.focus();
    };
  }, []);

  const dismissForSession = () => dismissUpgrades(upgradeKeys, false);

  const handleDialogClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) dismissForSession();
  };

  const handleSelectionChange = (upgrade: ReviewableSettingsUpgrade, optionId: string, selected: boolean) => {
    const option = upgrade.options.find((candidate) => candidate.id === optionId);
    if (!option) return;

    setUpgradeSelections((selections) => ({
      ...selections,
      [getSettingsUpgradeOptionSelectionKey(upgrade, option)]: selected,
    }));
  };

  const handleApplySelected = async () => {
    if (selectedUpgradeOptionCount === 0) {
      dismissUpgrades(upgradeKeys, true);
      return;
    }

    try {
      await setAccount(applySelectedSettingsUpgrades(account, upgrades, upgradeSelections));
      window.location.reload();
    } catch (error) {
      alert(t('settings_upgrade_error_saving'));
      if (error instanceof Error) console.log(error);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-describedby='settings-upgrade-modal-tip'
      aria-labelledby='settings-upgrade-modal-title'
      onCancel={(event) => {
        event.preventDefault();
        dismissForSession();
      }}
      onClick={handleDialogClick}
    >
      <div>
        <div className={styles.header}>
          <h2 id='settings-upgrade-modal-title'>{t('advanced_settings_upgrade_available')}</h2>
          <button type='button' className={styles.closeButton} aria-label={t('close')} title={t('close')} onClick={dismissForSession} />
        </div>
        <div className={styles.body}>
          <p id='settings-upgrade-modal-tip' className={styles.tip}>
            {t('advanced_settings_upgrade_tip')}
          </p>
          {upgrades.map((upgrade, upgradeIndex) => (
            <fieldset className={styles.options} key={upgrade.id}>
              <legend>{t(upgrade.labelKey)}</legend>
              {upgrade.options.map((option, optionIndex) => (
                <label className={styles.option} key={option.id}>
                  <input
                    ref={upgradeIndex === 0 && optionIndex === 0 ? initialFocusRef : undefined}
                    type='checkbox'
                    aria-label={t(option.ariaLabelKey, option.ariaLabelValues)}
                    checked={isSettingsUpgradeOptionSelected(upgrade, option, upgradeSelections)}
                    onChange={(event) => handleSelectionChange(upgrade, option.id, event.currentTarget.checked)}
                  />
                  {option.label}
                </label>
              ))}
            </fieldset>
          ))}
          <div className={styles.actions}>
            <button type='button' onClick={() => dismissUpgrades(upgradeKeys, true)}>
              {t('settings_upgrade_keep_current')}
            </button>
            <button type='button' onClick={handleApplySelected} disabled={selectedUpgradeOptionCount === 0}>
              {t('settings_upgrade_apply_selected')}
            </button>
          </div>
          {allowPermanentHide && (
            <div className={styles.neverShowAgainAction}>
              <button type='button' onClick={() => hideUpgrades(upgradeKeys)}>
                {t('settings_upgrade_never_show_again')}
              </button>
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
};

const SettingsUpgradeModal = () => {
  const account = useAccount() as SettingsUpgradeAccount | undefined;
  const pkcRpc = usePkcRpcSettings();
  const { dismissUpgradeKeys, hiddenReviewUpgradeKeys, hideReviewUpgradeKeys, persistentDismissedUpgradeKeys, reviewedUpgradeKeys, reviewRequestId } =
    useSettingsUpgradeReviewStore();
  const [sessionDismissedUpgradeKeys, setSessionDismissedUpgradeKeys] = useState<{ reviewRequestId: number; upgradeKeys: string[] }>(() => ({
    reviewRequestId,
    upgradeKeys: [],
  }));

  if (!account || pkcRpc?.state === 'connected') return null;

  const activeSessionDismissedUpgradeKeys = sessionDismissedUpgradeKeys.reviewRequestId === reviewRequestId ? sessionDismissedUpgradeKeys.upgradeKeys : [];
  const dismissedUpgradeKeys = new Set([...persistentDismissedUpgradeKeys, ...hiddenReviewUpgradeKeys, ...activeSessionDismissedUpgradeKeys]);
  const settingsUpgrades = getReviewableSettingsUpgrades(account).filter((upgrade) => !dismissedUpgradeKeys.has(getSettingsUpgradeKey(account, upgrade)));
  if (settingsUpgrades.length === 0) return null;

  const upgradeKeys = settingsUpgrades.map((upgrade) => getSettingsUpgradeKey(account, upgrade));
  const reviewedUpgradeKeySet = new Set(reviewedUpgradeKeys);
  const allowPermanentHide = upgradeKeys.some((upgradeKey) => reviewedUpgradeKeySet.has(upgradeKey));

  const dismissUpgrades = (nextUpgradeKeys: string[], persist: boolean) => {
    if (persist) {
      dismissUpgradeKeys(nextUpgradeKeys);
      return;
    }

    setSessionDismissedUpgradeKeys({
      reviewRequestId,
      upgradeKeys: [...new Set([...activeSessionDismissedUpgradeKeys, ...nextUpgradeKeys])],
    });
  };

  return (
    <SettingsUpgradeModalContent
      key={upgradeKeys.join('\n')}
      account={account}
      allowPermanentHide={allowPermanentHide}
      dismissUpgrades={dismissUpgrades}
      hideUpgrades={hideReviewUpgradeKeys}
      upgradeKeys={upgradeKeys}
      upgrades={settingsUpgrades}
    />
  );
};

export default SettingsUpgradeModal;
