import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createStorage = () => {
  const values = new Map<string, string>();
  return {
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
  } satisfies Storage;
};

describe('useSettingsUpgradeReviewStore', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('localStorage', createStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('persists dismissals and lets an explicit review reopen them', async () => {
    const { default: useSettingsUpgradeReviewStore, DISMISSED_SETTINGS_UPGRADES_KEY } = await import('./use-settings-upgrade-review-store');
    const upgradeKey = 'account-1:http-routers:one|two';

    useSettingsUpgradeReviewStore.getState().dismissUpgradeKeys([upgradeKey]);
    expect(useSettingsUpgradeReviewStore.getState().persistentDismissedUpgradeKeys).toEqual([upgradeKey]);
    expect(localStorage.getItem(DISMISSED_SETTINGS_UPGRADES_KEY)).toBe(JSON.stringify([upgradeKey]));

    useSettingsUpgradeReviewStore.getState().reviewUpgradeKeys([upgradeKey]);
    expect(useSettingsUpgradeReviewStore.getState()).toMatchObject({
      persistentDismissedUpgradeKeys: [],
      reviewedUpgradeKeys: [upgradeKey],
      reviewRequestId: 1,
    });
  });

  it('persists permanent review hides independently of a session close', async () => {
    const {
      default: useSettingsUpgradeReviewStore,
      DISMISSED_SETTINGS_UPGRADES_KEY,
      HIDDEN_SETTINGS_UPGRADE_REVIEWS_KEY,
    } = await import('./use-settings-upgrade-review-store');
    const upgradeKey = 'account-1:http-routers:one|two';

    useSettingsUpgradeReviewStore.getState().hideReviewUpgradeKeys([upgradeKey, upgradeKey]);

    expect(useSettingsUpgradeReviewStore.getState().hiddenReviewUpgradeKeys).toEqual([upgradeKey]);
    expect(localStorage.getItem(DISMISSED_SETTINGS_UPGRADES_KEY)).toBe(JSON.stringify([upgradeKey]));
    expect(localStorage.getItem(HIDDEN_SETTINGS_UPGRADE_REVIEWS_KEY)).toBe(JSON.stringify([upgradeKey]));
  });
});
