import { addBrowserHttpRoutersOptions, getBrowserHttpRoutersSettingsUpgrade } from './p2p-browser-config';

type AccountProtocolOptions = {
  httpRoutersOptions?: string[];
  [key: string]: unknown;
};

export type SettingsUpgradeAccount = Record<string, unknown> & {
  id?: string;
  name?: string;
  pkcOptions?: AccountProtocolOptions;
};

export type ReviewableSettingsUpgradeOption = {
  id: string;
  label: string;
  ariaLabelKey: string;
  ariaLabelValues?: Record<string, string>;
  selectedByDefault?: boolean;
};

export type ReviewableSettingsUpgrade = {
  id: string;
  labelKey: string;
  options: ReviewableSettingsUpgradeOption[];
  applySelectedOptions: (account: SettingsUpgradeAccount, selectedOptionIds: string[]) => SettingsUpgradeAccount;
};

type SettingsUpgradeDetector = (account: SettingsUpgradeAccount) => ReviewableSettingsUpgrade | undefined;

export type SettingsUpgradeSelections = Record<string, boolean>;

const getHttpRoutersSettingsUpgrade: SettingsUpgradeDetector = (account) => {
  const httpRoutersUpgrade = getBrowserHttpRoutersSettingsUpgrade(account.pkcOptions?.httpRoutersOptions);
  if (!httpRoutersUpgrade) return undefined;

  return {
    id: 'http-routers',
    labelKey: 'advanced_settings_upgrade_http_routers',
    options: httpRoutersUpgrade.missingDefaultHttpRoutersOptions.map((routerUrl) => ({
      id: routerUrl,
      label: routerUrl,
      ariaLabelKey: 'advanced_settings_upgrade_http_router_aria',
      ariaLabelValues: { router: routerUrl },
      selectedByDefault: true,
    })),
    applySelectedOptions: (nextAccount, selectedRouters) => ({
      ...nextAccount,
      pkcOptions: {
        ...nextAccount.pkcOptions,
        httpRoutersOptions: addBrowserHttpRoutersOptions(nextAccount.pkcOptions?.httpRoutersOptions, selectedRouters),
      },
    }),
  };
};

const SETTINGS_UPGRADE_DETECTORS: SettingsUpgradeDetector[] = [getHttpRoutersSettingsUpgrade];

export const getReviewableSettingsUpgrades = (account: SettingsUpgradeAccount) =>
  SETTINGS_UPGRADE_DETECTORS.reduce<ReviewableSettingsUpgrade[]>((upgrades, getUpgrade) => {
    const upgrade = getUpgrade(account);
    if (upgrade) upgrades.push(upgrade);
    return upgrades;
  }, []);

export const getSettingsUpgradeKey = (account: SettingsUpgradeAccount, upgrade: ReviewableSettingsUpgrade) =>
  `${account.id ?? account.name ?? 'unknown'}:${upgrade.id}:${upgrade.options.map((option) => option.id).join('|')}`;

export const getSettingsUpgradeOptionSelectionKey = (upgrade: ReviewableSettingsUpgrade, option: ReviewableSettingsUpgradeOption) => `${upgrade.id}:${option.id}`;

export const isSettingsUpgradeOptionSelected = (upgrade: ReviewableSettingsUpgrade, option: ReviewableSettingsUpgradeOption, selections: SettingsUpgradeSelections) =>
  selections[getSettingsUpgradeOptionSelectionKey(upgrade, option)] ?? option.selectedByDefault ?? true;

export const getSelectedSettingsUpgradeOptionIds = (upgrade: ReviewableSettingsUpgrade, selections: SettingsUpgradeSelections) =>
  upgrade.options.filter((option) => isSettingsUpgradeOptionSelected(upgrade, option, selections)).map((option) => option.id);

export const getSelectedSettingsUpgradeOptionCount = (upgrades: ReviewableSettingsUpgrade[], selections: SettingsUpgradeSelections) =>
  upgrades.reduce((selectedCount, upgrade) => selectedCount + getSelectedSettingsUpgradeOptionIds(upgrade, selections).length, 0);

export const applySelectedSettingsUpgrades = (account: SettingsUpgradeAccount, upgrades: ReviewableSettingsUpgrade[], selections: SettingsUpgradeSelections) =>
  upgrades.reduce<SettingsUpgradeAccount>((nextAccount, upgrade) => {
    const selectedOptionIds = getSelectedSettingsUpgradeOptionIds(upgrade, selections);
    return selectedOptionIds.length > 0 ? upgrade.applySelectedOptions(nextAccount, selectedOptionIds) : nextAccount;
  }, account);
