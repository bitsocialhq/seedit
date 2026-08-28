import { describe, expect, it } from 'vitest';
import {
  getDefaultElectronConfig,
  getDefaultWebConfig,
  getImportedAccountActiveName,
  processImportedAccount,
  readImportedAccountAddresses,
  rememberImportedAccountAddress,
} from './account-import-utils';
import { shouldUpgradeBrowserPureP2PAccount } from '../p2p-runtime';

const browserWindow = {} as Window;

describe('imported account activation name', () => {
  it('uses the imported name when it is available', () => {
    expect(getImportedAccountActiveName('Account dress', [{ name: 'Account stitch' }])).toBe('Account dress');
  });

  it('uses the next available suffix when the imported name exists', () => {
    const accounts = [{ name: 'Account dress' }, { name: 'Account dress 2' }, { name: 'Account dress 3' }];

    expect(getImportedAccountActiveName('Account dress', accounts)).toBe('Account dress 4');
  });

  it('returns undefined when the imported backup has no account name', () => {
    expect(getImportedAccountActiveName(undefined, [])).toBeUndefined();
  });

  it('tolerates account entries the hooks store has not hydrated yet', () => {
    const accounts = [{ name: 'Account dress' }, undefined] as unknown as Array<{ name?: string }>;

    expect(getImportedAccountActiveName('Account dress', accounts)).toBe('Account dress 2');
  });
});

describe('imported account metadata', () => {
  it('rejects invalid backup shapes before calling hooks', () => {
    expect(() => processImportedAccount('null', false, browserWindow)).toThrow('Account backup must be a JSON object.');
    expect(() => processImportedAccount('{}', false, browserWindow)).toThrow('Account backup is missing account data.');
  });

  it('preserves legacy, short-address, and custom account names', () => {
    for (const name of ['Account 1', 'Account dress', 'Personal']) {
      const result = JSON.parse(processImportedAccount(JSON.stringify({ account: { name } }), false, browserWindow));
      expect(result.account.name).toBe(name);
    }
  });

  it('merges owned communities into subscriptions without duplicates', () => {
    const result = JSON.parse(
      processImportedAccount(
        JSON.stringify({
          account: {
            communities: { 'business.eth': {}, 'music.bso': {} },
            subscriptions: ['business.eth', 'technology.bso'],
          },
        }),
        false,
        browserWindow,
      ),
    );

    expect(result.account.subscriptions).toEqual(['business.eth', 'technology.bso', 'music.bso']);
  });

  it('tracks every imported address while maintaining the legacy latest-address key', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };

    rememberImportedAccountAddress('address-1', storage);
    rememberImportedAccountAddress('address-2', storage);

    expect(readImportedAccountAddresses(storage)).toEqual(['address-1', 'address-2']);
    expect(storage.getItem('importedAccountAddress')).toBe('address-2');
  });
});

describe('account import PKC options', () => {
  it('includes only supported chain providers in platform defaults', () => {
    expect(Object.keys(getDefaultWebConfig().chainProviders ?? {})).toEqual(['eth']);
    expect(Object.keys(getDefaultElectronConfig().chainProviders ?? {})).toEqual(['eth']);
  });

  it('keeps only supported providers from current and legacy locations', () => {
    const importedAccount = {
      account: {
        chainProviders: {
          eth: { urls: ['https://eth.example'], chainId: 1 },
          unknown: { urls: ['https://unknown.example'], chainId: 123 },
        },
        pkcOptions: {
          pubsubKuboRpcClientsOptions: ['https://pubsub.example'],
          chainProviders: {
            eth: { urls: ['https://legacy-eth.example'], chainId: 1 },
            unknown: { urls: ['https://legacy-unknown.example'], chainId: 123 },
          },
        },
      },
    };

    const result = JSON.parse(processImportedAccount(JSON.stringify(importedAccount), false, browserWindow));

    expect(result.account.chainProviders).toEqual({
      eth: { urls: ['https://eth.example'], chainId: 1 },
    });
    expect(result.account.pkcOptions.chainProviders).toEqual({
      eth: { urls: ['https://legacy-eth.example'], chainId: 1 },
    });
  });

  it('preserves supported provider overrides when import replaces transport options with platform defaults', () => {
    const importedAccount = {
      account: {
        pkcOptions: {
          pubsubKuboRpcClientsOptions: ['https://pubsub.example'],
          chainProviders: {
            eth: { urls: ['https://custom-eth.example'], chainId: 1 },
            unknown: { urls: ['https://unknown.example'], chainId: 123 },
          },
        },
      },
    };

    const result = JSON.parse(processImportedAccount(JSON.stringify(importedAccount), true));

    expect(result.account.pkcOptions.pkcRpcClientsOptions).toEqual(['ws://localhost:9138']);
    expect(result.account.pkcOptions.chainProviders).toMatchObject({
      eth: { urls: ['https://custom-eth.example'], chainId: 1 },
    });
    expect(Object.keys(result.account.pkcOptions.chainProviders)).toEqual(['eth']);
  });

  it('adds the legacy router baseline when imported protocol options omit routers', () => {
    const result = JSON.parse(
      processImportedAccount(
        JSON.stringify({
          account: {
            pkcOptions: {
              pubsubKuboRpcClientsOptions: ['https://pubsub.example'],
            },
          },
        }),
        false,
        browserWindow,
      ),
    );

    expect(result.account.pkcOptions.httpRoutersOptions).toEqual(getDefaultWebConfig().httpRoutersOptions);
  });

  it('preserves explicit custom and empty router lists', () => {
    const customRouters = JSON.parse(
      processImportedAccount(
        JSON.stringify({ account: { pkcOptions: { pubsubKuboRpcClientsOptions: ['https://pubsub.example'], httpRoutersOptions: ['https://custom.example'] } } }),
        false,
        browserWindow,
      ),
    );
    const emptyRouters = JSON.parse(
      processImportedAccount(
        JSON.stringify({ account: { pkcOptions: { pubsubKuboRpcClientsOptions: ['https://pubsub.example'], httpRoutersOptions: [] } } }),
        false,
        browserWindow,
      ),
    );

    expect(customRouters.account.pkcOptions.httpRoutersOptions).toEqual(['https://custom.example']);
    expect(emptyRouters.account.pkcOptions.httpRoutersOptions).toEqual([]);
    expect(customRouters.account.pkcOptions.libp2pJsClientsOptions).toEqual([{ key: 'libp2pjs' }]);
    expect(customRouters.account.pkcOptions.pubsubKuboRpcClientsOptions).toBeUndefined();
    expect(shouldUpgradeBrowserPureP2PAccount(customRouters.account, browserWindow)).toBe(false);
  });

  it('preserves an already-modern browser libp2p configuration', () => {
    const result = JSON.parse(
      processImportedAccount(
        JSON.stringify({
          account: {
            pkcOptions: {
              libp2pJsClientsOptions: [{ key: 'libp2pjs', options: { bootstrap: ['custom-peer'] } }],
              httpRoutersOptions: ['https://custom.example'],
              resolveAuthorAddresses: true,
            },
          },
        }),
        false,
        browserWindow,
      ),
    );

    expect(result.account.pkcOptions.libp2pJsClientsOptions).toEqual([{ key: 'libp2pjs', options: { bootstrap: ['custom-peer'] } }]);
    expect(result.account.pkcOptions.resolveAuthorAddresses).toBe(true);
  });

  it('preserves the backup router list when an electron import falls back to platform defaults', () => {
    const result = JSON.parse(
      processImportedAccount(
        JSON.stringify({ account: { pkcOptions: { pubsubKuboRpcClientsOptions: ['https://pubsub.example'], httpRoutersOptions: ['https://custom.example'] } } }),
        true,
      ),
    );

    expect(result.account.pkcOptions.pkcRpcClientsOptions).toEqual(['ws://localhost:9138']);
    expect(result.account.pkcOptions.httpRoutersOptions).toEqual(['https://custom.example']);
  });

  it('keeps a remote rpc endpoint that sits alongside a localhost entry', () => {
    const result = JSON.parse(
      processImportedAccount(
        JSON.stringify({
          account: { pkcOptions: { pkcRpcClientsOptions: ['ws://localhost:9138', 'wss://remote.example'], httpRoutersOptions: ['https://custom.example'] } },
        }),
        false,
        browserWindow,
      ),
    );

    expect(result.account.pkcOptions.pkcRpcClientsOptions).toEqual(['ws://localhost:9138', 'wss://remote.example']);
    expect(result.account.pkcOptions.httpRoutersOptions).toEqual(['https://custom.example']);
  });

  it('falls back to platform defaults when the backup carries a non-object pkcOptions', () => {
    const result = JSON.parse(processImportedAccount(JSON.stringify({ account: { pkcOptions: 'ws://localhost:9138' } }), true));

    expect(result.account.pkcOptions).toEqual(getDefaultElectronConfig());
  });
});
