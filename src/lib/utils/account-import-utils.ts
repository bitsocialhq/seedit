interface PkcOptions {
  ipfsGatewayUrls?: string[];
  pubsubKuboRpcClientsOptions?: string[];
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
}

interface ImportedAccount {
  account?: {
    pkcOptions?: PkcOptions;
    [key: string]: any;
  };
  [key: string]: any;
}

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
    avax: {
      urls: ['https://api.avax.network/ext/bc/C/rpc'],
      chainId: 43114,
    },
    matic: {
      urls: ['https://polygon-rpc.com'],
      chainId: 137,
    },
    sol: {
      urls: ['https://solrpc.xyz'],
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
    avax: {
      urls: ['https://api.avax.network/ext/bc/C/rpc'],
      chainId: 43114,
    },
    matic: {
      urls: ['https://polygon-rpc.com'],
      chainId: 137,
    },
    sol: {
      urls: ['https://solrpc.xyz'],
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
  const currentOptions = importedAccount.account?.pkcOptions || {};

  // Don't overwrite non-localhost RPC configurations
  if (hasNonLocalhostRpc(currentOptions)) {
    return currentOptions;
  }

  if (isElectron) {
    // On electron: if account has pubsub providers, replace with localhost RPC
    if (hasPubsubProviders(currentOptions)) {
      return getDefaultElectronConfig();
    }
    // If already has localhost RPC or no providers, use electron defaults
    return (currentOptions.pkcRpcClientsOptions?.length ?? 0) > 0 ? currentOptions : getDefaultElectronConfig();
  } else {
    // On web: if account has localhost RPC, replace with pubsub providers
    if (hasLocalhostRpc(currentOptions)) {
      return getDefaultWebConfig();
    }
    // If no RPC or has pubsub providers, use web defaults
    return (currentOptions.pubsubKuboRpcClientsOptions?.length ?? 0) > 0 ? currentOptions : getDefaultWebConfig();
  }
};

/**
 * Processes an imported account by transforming its PKC options
 * Returns the modified account as a JSON string ready for import
 */
export const processImportedAccount = (accountJson: string, isElectron: boolean): string => {
  let importedAccount;

  try {
    importedAccount = JSON.parse(accountJson);
  } catch (error) {
    throw new Error(`Failed to parse account data: ${error instanceof Error ? error.message : 'Unknown parsing error'}`);
  }

  // Ensure account object exists
  if (!importedAccount.account) {
    importedAccount.account = {};
  }

  // Support accounts exported by older versions that used the legacy field name
  if (!importedAccount.account.pkcOptions && importedAccount.account.plebbitOptions) {
    importedAccount.account.pkcOptions = importedAccount.account.plebbitOptions;
    delete importedAccount.account.plebbitOptions;
  }

  // Transform pkcOptions based on platform and existing config
  if (importedAccount.account.pkcOptions) {
    importedAccount.account.pkcOptions = transformPkcOptionsForImport(importedAccount, isElectron);
  } else {
    // If no pkcOptions exist, set defaults based on platform
    importedAccount.account.pkcOptions = isElectron ? getDefaultElectronConfig() : getDefaultWebConfig();
  }

  return JSON.stringify(importedAccount);
};
