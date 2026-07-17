import { describe, expect, it } from 'vitest';
import { getDefaultElectronConfig, getDefaultWebConfig, processImportedAccount } from './account-import-utils';

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
          avax: { urls: ['https://avax.example'], chainId: 43114 },
          matic: { urls: ['https://matic.example'], chainId: 137 },
          unknown: { urls: ['https://unknown.example'], chainId: 123 },
        },
        pkcOptions: {
          pubsubKuboRpcClientsOptions: ['https://pubsub.example'],
          chainProviders: {
            eth: { urls: ['https://legacy-eth.example'], chainId: 1 },
            avax: { urls: ['https://avax.example'], chainId: 43114 },
            matic: { urls: ['https://matic.example'], chainId: 137 },
            unknown: { urls: ['https://legacy-unknown.example'], chainId: 123 },
          },
        },
      },
    };

    const result = JSON.parse(processImportedAccount(JSON.stringify(importedAccount), false));

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
            matic: { urls: ['https://matic.example'], chainId: 137 },
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
});
