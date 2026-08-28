import { getSupportedChainProviders } from './chain-provider-utils';
import { getBrowserPureP2PAccountOptions, shouldUpgradeBrowserPureP2PAccount } from '../p2p-runtime';

interface PkcOptions {
  ipfsGatewayUrls?: string[];
  kuboRpcClientsOptions?: unknown[];
  libp2pJsClientsOptions?: unknown[];
  pubsubKuboRpcClientsOptions?: string[];
  pubsubHttpClientsOptions?: unknown[];
  pkcRpcClientsOptions?: string[];
  httpRoutersOptions?: string[];
  chainProviders?: {
    [key: string]: {
      urls: string[];
      chainId: number;
    };
  };
  resolveAuthorAddresses?: boolean;
  validatePages?: boolean;
  [key: string]: unknown;
}

interface ImportedAccount {
  account?: {
    author?: { address?: string };
    chainProviders?: PkcOptions['chainProviders'];
    communities?: Record<string, unknown>;
    name?: string;
    pkcOptions?: PkcOptions;
    subscriptions?: string[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

const IMPORTED_ACCOUNT_ADDRESSES_STORAGE_KEY = 'importedAccountAddresses';
const IMPORTED_ACCOUNT_ADDRESS_LEGACY_STORAGE_KEY = 'importedAccountAddress';

export const readImportedAccountAddresses = (storage: Pick<Storage, 'getItem'> = localStorage): string[] => {
  try {
    const storedAddresses = storage.getItem(IMPORTED_ACCOUNT_ADDRESSES_STORAGE_KEY);
    const parsedAddresses: unknown = storedAddresses ? JSON.parse(storedAddresses) : null;
    const normalizedAddresses = Array.isArray(parsedAddresses)
      ? parsedAddresses.filter((address): address is string => typeof address === 'string' && address.length > 0)
      : [];
    const legacyAddress = storage.getItem(IMPORTED_ACCOUNT_ADDRESS_LEGACY_STORAGE_KEY);
    return [...new Set(legacyAddress ? [...normalizedAddresses, legacyAddress] : normalizedAddresses)];
  } catch (error) {
    console.warn('Failed to read imported account addresses from localStorage:', error);
    return [];
  }
};

export const rememberImportedAccountAddress = (address: string, storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage) => {
  try {
    const importedAddresses = readImportedAccountAddresses(storage);
    storage.setItem(IMPORTED_ACCOUNT_ADDRESSES_STORAGE_KEY, JSON.stringify([...new Set([...importedAddresses, address])]));
    storage.setItem(IMPORTED_ACCOUNT_ADDRESS_LEGACY_STORAGE_KEY, address);
  } catch (error) {
    console.warn('Failed to save imported account address to localStorage:', error);
  }
};

export const getImportedAccountActiveName = (importedAccountName: string | undefined, accounts: Array<{ name?: string }>): string | undefined => {
  if (!importedAccountName) {
    return undefined;
  }

  const accountNames = new Set(accounts.map((account) => account.name));
  if (!accountNames.has(importedAccountName)) {
    return importedAccountName;
  }

  let suffix = 2;
  while (accountNames.has(`${importedAccountName} ${suffix}`)) {
    suffix += 1;
  }
  return `${importedAccountName} ${suffix}`;
};

// Default configuration for web/mobile platforms
export const getDefaultWebConfig = (): PkcOptions => ({
  ipfsGatewayUrls: ['https://ipfsgateway.xyz', 'https://gateway.plebpubsub.xyz', 'https://gateway.forumindex.com'],
  pubsubKuboRpcClientsOptions: ['https://pubsubprovider.xyz/api/v0', 'https://plebpubsub.xyz/api/v0', 'https://rannithepleb.com/api/v0'],
  httpRoutersOptions: ['https://routing.lol', 'https://peers.pleb.bot', 'https://peers.plebpubsub.xyz', 'https://peers.forumindex.com'],
  chainProviders: {
    eth: {
      urls: ['ethers.js', 'https://ethrpc.xyz', 'viem'],
      chainId: 1,
    },
  },
  resolveAuthorAddresses: false,
  validatePages: false,
});

// Default configuration for Electron platform
export const getDefaultElectronConfig = (): PkcOptions => ({
  pkcRpcClientsOptions: ['ws://localhost:9138'],
  httpRoutersOptions: ['https://peers.pleb.bot', 'https://routing.lol', 'https://peers.forumindex.com', 'https://peers.plebpubsub.xyz'],
  chainProviders: {
    eth: {
      urls: ['ethers.js', 'https://ethrpc.xyz', 'viem'],
      chainId: 1,
    },
  },
  resolveAuthorAddresses: false,
  validatePages: false,
});

// Check if RPC URL is localhost
const isLocalhostRpc = (url: string): boolean => {
  return url.includes('localhost') || url.includes('127.0.0.1');
};

// Check if account has non-localhost RPC configuration
const hasNonLocalhostRpc = (options: PkcOptions): boolean => {
  const hasRpcOptions = (options.pkcRpcClientsOptions?.length ?? 0) > 0;
  return hasRpcOptions && !options.pkcRpcClientsOptions?.some(isLocalhostRpc);
};

// Check if account has pubsub providers configured
const hasPubsubProviders = (options: PkcOptions): boolean => {
  return (options.pubsubKuboRpcClientsOptions?.length ?? 0) > 0 || (options.ipfsGatewayUrls?.length ?? 0) > 0;
};

const hasBrowserLibp2pProvider = (options: PkcOptions): boolean => (options.libp2pJsClientsOptions?.length ?? 0) > 0;

// Check if account has localhost RPC configured
const hasLocalhostRpc = (options: PkcOptions): boolean => {
  const hasRpcOptions = (options.pkcRpcClientsOptions?.length ?? 0) > 0;
  return hasRpcOptions && (options.pkcRpcClientsOptions?.some(isLocalhostRpc) ?? false);
};

/**
 * Transforms PKC options for imported accounts based on platform and existing configuration
 *
 * Logic:
 * - Preserves non-localhost RPC configurations
 * - On Electron: replaces pubsub providers with localhost RPC
 * - On Web: replaces localhost RPC with pubsub providers
 * - Sets platform-appropriate defaults for missing configurations
 */
export const transformPkcOptionsForImport = (importedAccount: ImportedAccount, isElectron: boolean): PkcOptions => {
  const importedOptions = importedAccount.account?.pkcOptions || {};
  const currentOptions = {
    ...importedOptions,
    chainProviders: getSupportedChainProviders(importedOptions.chainProviders),
  };
  const getPlatformDefaults = () => {
    const defaults = isElectron ? getDefaultElectronConfig() : getDefaultWebConfig();
    if (!currentOptions.chainProviders) return defaults;

    return {
      ...defaults,
      chainProviders: {
        ...defaults.chainProviders,
        ...currentOptions.chainProviders,
      },
    };
  };

  // Don't overwrite non-localhost RPC configurations
  if (hasNonLocalhostRpc(currentOptions)) {
    return currentOptions;
  }

  if (isElectron) {
    // On electron: if account has pubsub providers, replace with localhost RPC
    if (hasPubsubProviders(currentOptions)) {
      return getPlatformDefaults();
    }
    // If already has localhost RPC or no providers, use electron defaults
    return (currentOptions.pkcRpcClientsOptions?.length ?? 0) > 0 ? currentOptions : getPlatformDefaults();
  } else {
    // On web: if account has localhost RPC, replace with pubsub providers
    if (hasLocalhostRpc(currentOptions)) {
      return getPlatformDefaults();
    }
    // Preserve both current browser transports; missing transports use web defaults.
    return hasBrowserLibp2pProvider(currentOptions) || hasPubsubProviders(currentOptions) ? currentOptions : getPlatformDefaults();
  }
};

/**
 * Processes an imported account by transforming its PKC options
 * Returns the modified account as a JSON string ready for import
 */
export const processImportedAccount = (accountJson: string, isElectron: boolean, targetWindow?: Window): string => {
  let importedAccount: ImportedAccount;

  try {
    const parsedAccount: unknown = JSON.parse(accountJson);
    if (!parsedAccount || typeof parsedAccount !== 'object' || Array.isArray(parsedAccount)) {
      throw new Error('Account backup must be a JSON object.');
    }
    importedAccount = parsedAccount as ImportedAccount;
  } catch (error) {
    throw new Error(`Failed to parse account data: ${error instanceof Error ? error.message : 'Unknown parsing error'}`);
  }

  if (!importedAccount.account || typeof importedAccount.account !== 'object' || Array.isArray(importedAccount.account)) {
    throw new Error('Account backup is missing account data.');
  }
  if (importedAccount.account.communities) {
    const subscriptions = Array.isArray(importedAccount.account.subscriptions) ? importedAccount.account.subscriptions : [];
    importedAccount.account.subscriptions = [...new Set([...subscriptions, ...Object.keys(importedAccount.account.communities)])];
  }
  const explicitImportedHttpRoutersOptions = importedAccount.account.pkcOptions?.httpRoutersOptions;

  if (importedAccount.account.chainProviders) {
    importedAccount.account.chainProviders = getSupportedChainProviders(importedAccount.account.chainProviders);
  }

  if (importedAccount.account.pkcOptions && !Array.isArray(importedAccount.account.pkcOptions.httpRoutersOptions)) {
    importedAccount.account.pkcOptions.httpRoutersOptions = (isElectron ? getDefaultElectronConfig() : getDefaultWebConfig()).httpRoutersOptions;
  }

  // Transform pkcOptions based on platform and existing config
  if (importedAccount.account.pkcOptions) {
    importedAccount.account.pkcOptions = transformPkcOptionsForImport(importedAccount, isElectron);
  } else {
    // If no pkcOptions exist, set defaults based on platform
    importedAccount.account.pkcOptions = isElectron ? getDefaultElectronConfig() : getDefaultWebConfig();
  }

  const browserWindow = targetWindow ?? (typeof window === 'undefined' ? undefined : window);
  if (!isElectron && browserWindow && shouldUpgradeBrowserPureP2PAccount(importedAccount.account, browserWindow)) {
    importedAccount.account.pkcOptions = {
      ...getBrowserPureP2PAccountOptions(importedAccount.account),
      ...(Array.isArray(explicitImportedHttpRoutersOptions) ? { httpRoutersOptions: explicitImportedHttpRoutersOptions } : {}),
    };
  }

  return JSON.stringify(importedAccount);
};
