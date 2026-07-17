import { create } from 'zustand';

export const DISMISSED_SETTINGS_UPGRADES_KEY = 'seedit:dismissed-settings-upgrades';
export const HIDDEN_SETTINGS_UPGRADE_REVIEWS_KEY = 'seedit:hidden-settings-upgrade-reviews';

const uniqueUpgradeKeys = (upgradeKeys: string[]) => [...new Set(upgradeKeys)];

const readStoredUpgradeKeys = (storageKey: string) => {
  try {
    const parsedKeys = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    return Array.isArray(parsedKeys) ? parsedKeys.filter((key): key is string => typeof key === 'string') : [];
  } catch {
    return [];
  }
};

const writeStoredUpgradeKeys = (storageKey: string, upgradeKeys: string[]) => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(uniqueUpgradeKeys(upgradeKeys)));
  } catch {
    return;
  }
};

type SettingsUpgradeReviewState = {
  hiddenReviewUpgradeKeys: string[];
  persistentDismissedUpgradeKeys: string[];
  reviewedUpgradeKeys: string[];
  reviewRequestId: number;
  dismissUpgradeKeys: (upgradeKeys: string[]) => void;
  hideReviewUpgradeKeys: (upgradeKeys: string[]) => void;
  reviewUpgradeKeys: (upgradeKeys: string[]) => void;
};

const useSettingsUpgradeReviewStore = create<SettingsUpgradeReviewState>((set, get) => ({
  hiddenReviewUpgradeKeys: readStoredUpgradeKeys(HIDDEN_SETTINGS_UPGRADE_REVIEWS_KEY),
  persistentDismissedUpgradeKeys: readStoredUpgradeKeys(DISMISSED_SETTINGS_UPGRADES_KEY),
  reviewedUpgradeKeys: [],
  reviewRequestId: 0,
  dismissUpgradeKeys: (upgradeKeys) => {
    const persistentDismissedUpgradeKeys = uniqueUpgradeKeys([...get().persistentDismissedUpgradeKeys, ...upgradeKeys]);
    writeStoredUpgradeKeys(DISMISSED_SETTINGS_UPGRADES_KEY, persistentDismissedUpgradeKeys);
    set({ persistentDismissedUpgradeKeys });
  },
  hideReviewUpgradeKeys: (upgradeKeys) => {
    const persistentDismissedUpgradeKeys = uniqueUpgradeKeys([...get().persistentDismissedUpgradeKeys, ...upgradeKeys]);
    const hiddenReviewUpgradeKeys = uniqueUpgradeKeys([...get().hiddenReviewUpgradeKeys, ...upgradeKeys]);
    writeStoredUpgradeKeys(DISMISSED_SETTINGS_UPGRADES_KEY, persistentDismissedUpgradeKeys);
    writeStoredUpgradeKeys(HIDDEN_SETTINGS_UPGRADE_REVIEWS_KEY, hiddenReviewUpgradeKeys);
    set({ hiddenReviewUpgradeKeys, persistentDismissedUpgradeKeys });
  },
  reviewUpgradeKeys: (upgradeKeys) => {
    const upgradeKeysToReview = new Set(upgradeKeys);
    const persistentDismissedUpgradeKeys = get().persistentDismissedUpgradeKeys.filter((upgradeKey) => !upgradeKeysToReview.has(upgradeKey));
    const hiddenReviewUpgradeKeys = get().hiddenReviewUpgradeKeys.filter((upgradeKey) => !upgradeKeysToReview.has(upgradeKey));
    writeStoredUpgradeKeys(DISMISSED_SETTINGS_UPGRADES_KEY, persistentDismissedUpgradeKeys);
    writeStoredUpgradeKeys(HIDDEN_SETTINGS_UPGRADE_REVIEWS_KEY, hiddenReviewUpgradeKeys);
    set((state) => ({
      hiddenReviewUpgradeKeys,
      persistentDismissedUpgradeKeys,
      reviewedUpgradeKeys: uniqueUpgradeKeys([...state.reviewedUpgradeKeys, ...upgradeKeys]),
      reviewRequestId: state.reviewRequestId + 1,
    }));
  },
}));

export default useSettingsUpgradeReviewStore;
