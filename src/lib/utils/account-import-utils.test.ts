import { describe, expect, it } from 'vitest';
import { getDefaultElectronConfig, getDefaultWebConfig, processImportedAccount } from './account-import-utils';

describe('account import PKC options', () => {
  it('includes only supported chain providers in platform defaults', () => {
    expect(Object.keys(getDefaultWebConfig().chainProviders ?? {})).toEqual(['eth', 'avax', 'matic']);
    expect(Object.keys(getDefaultElectronConfig().chainProviders ?? {})).toEqual(['eth', 'avax', 'matic']);
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
            avax: { urls: ['https://avax.example'], chainId: 43114 },
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
      avax: { urls: ['https://avax.example'], chainId: 43114 },
    });
  });

  it('preserves supported provider overrides when import replaces transport options with platform defaults', () => {
    const importedAccount = {
      account: {
        pkcOptions: {
          pubsubKuboRpcClientsOptions: ['https://pubsub.example'],
          chainProviders: {
            matic: { urls: ['https://matic.example'], chainId: 137 },
          },
        },
      },
    };

    const result = JSON.parse(processImportedAccount(JSON.stringify(importedAccount), true));

    expect(result.account.pkcOptions.pkcRpcClientsOptions).toEqual(['ws://localhost:9138']);
    expect(result.account.pkcOptions.chainProviders).toMatchObject({
      eth: { urls: ['ethers.js', 'https://ethrpc.xyz', 'viem'], chainId: 1 },
      matic: { urls: ['https://matic.example'], chainId: 137 },
    });
  });
});
