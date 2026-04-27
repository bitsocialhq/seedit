import { useMemo } from 'react';
import {
  deleteCommunity as deleteCommunityBase,
  setAccount as setAccountBase,
  useAccountComment as useAccountCommentBase,
  useAccountCommunities as useAccountCommunitiesBase,
  useCommunities as useCommunitiesBase,
  useCommunitiesStates as useCommunitiesStatesBase,
  useCommunity as useCommunityBase,
  useCommunityStats as useCommunityStatsBase,
  useCreateCommunity as useCreateCommunityBase,
  useFeed as useFeedBase,
  usePublishCommunityEdit as usePublishCommunityEditBase,
  useSubscribe as useSubscribeBase,
} from '@bitsocial/bitsocial-react-hooks/dist/index.js';
import type {
  Account,
  AccountCommunity,
  Community,
  PublishCommunityEditOptions,
  UseAccountCommentOptions as BaseUseAccountCommentOptions,
  UseAccountCommentResult as BaseUseAccountCommentResult,
  UseAccountCommunitiesOptions,
  UseAccountCommunitiesResult,
  UseCommunitiesOptions,
  UseCommunitiesResult,
  UseCommunitiesStatesOptions,
  UseCommunitiesStatesResult,
  UseCommunityOptions,
  UseCommunityResult,
  UseCommunityStatsOptions,
  UseCommunityStatsResult,
  UseCreateCommunityOptions,
  UseCreateCommunityResult,
  UseFeedOptions as BaseUseFeedOptions,
  UseFeedResult as BaseUseFeedResult,
  UsePublishCommunityEditOptions,
  UsePublishCommunityEditResult,
  UseSubscribeOptions as BaseUseSubscribeOptions,
} from '@bitsocial/bitsocial-react-hooks/dist/index.js';
import accountsStore from '@bitsocial/bitsocial-react-hooks/dist/stores/accounts/index.js';

export * from '@bitsocial/bitsocial-react-hooks/dist/index.js';

type AliasAddresses<T extends { address?: string; subplebbitAddress?: string } | undefined> = T;

const withSubplebbitAddress = <T extends { address?: string; subplebbitAddress?: string } | undefined>(value: T): AliasAddresses<T> => {
  if (!value || value.subplebbitAddress || !value.address) {
    return value;
  }

  return { ...value, subplebbitAddress: value.address } as AliasAddresses<T>;
};

export type Subplebbit = Community;
export type AccountSubplebbit = AccountCommunity & Partial<Community>;
export type PublishSubplebbitEditOptions = PublishCommunityEditOptions;

export interface UseSubplebbitOptions extends Omit<UseCommunityOptions, 'communityAddress'> {
  subplebbitAddress?: string;
}

export interface UseSubplebbitsOptions extends Omit<UseCommunitiesOptions, 'communityAddresses'> {
  subplebbitAddresses?: string[];
}

export interface UseSubplebbitStatsOptions extends Omit<UseCommunityStatsOptions, 'communityAddress'> {
  subplebbitAddress?: string;
}

export interface UseAccountSubplebbitsResult extends Omit<UseAccountCommunitiesResult, 'accountCommunities'> {
  accountSubplebbits: UseAccountCommunitiesResult['accountCommunities'];
}

export interface UseFeedOptions extends Omit<BaseUseFeedOptions, 'communityAddresses'> {
  communityAddresses?: string[];
  subplebbitAddresses?: string[];
}

export interface UseFeedResult extends BaseUseFeedResult {
  subplebbitAddressesWithNewerPosts: string[];
}

export interface UseSubscribeOptions extends Omit<BaseUseSubscribeOptions, 'communityAddress'> {
  communityAddress?: string;
  subplebbitAddress?: string;
}

export interface UseSubplebbitsStatesOptions extends Omit<UseCommunitiesStatesOptions, 'communityAddresses'> {
  communityAddresses?: string[];
  subplebbitAddresses?: string[];
}

export interface UseSubplebbitsStatesResult extends Omit<UseCommunitiesStatesResult, 'states'> {
  states: {
    [state: string]: {
      subplebbitAddresses: string[];
      clientUrls: string[];
    };
  };
}

export interface UsePublishSubplebbitEditOptions extends Omit<UsePublishCommunityEditOptions, 'communityAddress'> {
  communityAddress?: string;
  subplebbitAddress?: string;
}

export interface UsePublishSubplebbitEditResult extends Omit<UsePublishCommunityEditResult, 'publishCommunityEdit'> {
  publishSubplebbitEdit(): Promise<void>;
}

export type UseCreateSubplebbitOptions = UseCreateCommunityOptions;

export interface UseCreateSubplebbitResult extends Omit<UseCreateCommunityResult, 'createdCommunity' | 'createCommunity'> {
  createdSubplebbit: UseCreateCommunityResult['createdCommunity'];
  createSubplebbit(): Promise<void>;
}

export interface UseAccountCommentOptions extends BaseUseAccountCommentOptions {}

export interface UseAccountCommentResult extends BaseUseAccountCommentResult {
  refresh(): Promise<void>;
}

const normalizeAccountForSet = (account: Account): Account => {
  const storedAccount = account?.id ? accountsStore.getState().accounts[account.id] : undefined;

  if (!storedAccount) {
    return account;
  }

  return {
    ...storedAccount,
    ...account,
    author: account.author ? { ...storedAccount.author, ...account.author } : storedAccount.author,
    subscriptions: account.subscriptions ?? storedAccount.subscriptions,
    blockedAddresses: account.blockedAddresses ?? storedAccount.blockedAddresses,
    blockedCids: account.blockedCids ?? storedAccount.blockedCids,
    communities: account.communities ?? storedAccount.communities,
    plebbitOptions: account.plebbitOptions ?? storedAccount.plebbitOptions,
    mediaIpfsGatewayUrl: account.mediaIpfsGatewayUrl ?? storedAccount.mediaIpfsGatewayUrl,
  };
};

export const useSubplebbit = (options?: UseSubplebbitOptions): UseCommunityResult => {
  const { subplebbitAddress, ...rest } = options || {};
  const community = useCommunityBase({ communityAddress: subplebbitAddress, ...rest });
  return useMemo(() => withSubplebbitAddress(community as any) as UseCommunityResult, [community]);
};

export const useSubplebbits = (options?: UseSubplebbitsOptions): UseCommunitiesResult & { subplebbits: UseCommunitiesResult['communities'] } => {
  const { subplebbitAddresses, ...rest } = options || {};
  const result = useCommunitiesBase({ communityAddresses: subplebbitAddresses, ...rest });

  return useMemo(
    () => ({
      ...result,
      communities: result.communities.map((community) => withSubplebbitAddress(community)),
      subplebbits: result.communities.map((community) => withSubplebbitAddress(community)),
    }),
    [result],
  );
};

export const useSubplebbitStats = (options?: UseSubplebbitStatsOptions): UseCommunityStatsResult => {
  const { subplebbitAddress, ...rest } = options || {};
  return useCommunityStatsBase({ communityAddress: subplebbitAddress, ...rest });
};

export const useAccountSubplebbits = (options?: UseAccountCommunitiesOptions): UseAccountSubplebbitsResult => {
  const result = useAccountCommunitiesBase(options);

  return useMemo(
    () => ({
      ...result,
      accountSubplebbits: result.accountCommunities,
    }),
    [result],
  );
};

export const useFeed = (options: UseFeedOptions): UseFeedResult => {
  const { subplebbitAddresses, communityAddresses, ...rest } = options;
  const result = useFeedBase({
    communityAddresses: communityAddresses || subplebbitAddresses || [],
    ...rest,
  });

  return useMemo(
    () => ({
      ...result,
      subplebbitAddressesWithNewerPosts: result.communityAddressesWithNewerPosts,
    }),
    [result],
  );
};

export const useSubscribe = (options?: UseSubscribeOptions) => {
  const { subplebbitAddress, communityAddress, ...rest } = options || {};
  return useSubscribeBase({ communityAddress: communityAddress || subplebbitAddress, ...rest });
};

export const useSubplebbitsStates = (options?: UseSubplebbitsStatesOptions): UseSubplebbitsStatesResult => {
  const { subplebbitAddresses, communityAddresses, ...rest } = options || {};
  const result = useCommunitiesStatesBase({
    communityAddresses: communityAddresses || subplebbitAddresses,
    ...rest,
  });

  return useMemo(
    () => ({
      ...result,
      states: Object.fromEntries(
        Object.entries(result.states).map(([state, value]) => [
          state,
          {
            subplebbitAddresses: value.communityAddresses,
            clientUrls: value.clientUrls,
          },
        ]),
      ),
    }),
    [result],
  );
};

export const useCreateSubplebbit = (options?: UseCreateSubplebbitOptions): UseCreateSubplebbitResult => {
  const result = useCreateCommunityBase(options);

  return useMemo(
    () => ({
      ...result,
      createdSubplebbit: withSubplebbitAddress(result.createdCommunity),
      createSubplebbit: result.createCommunity,
    }),
    [result],
  );
};

export const usePublishSubplebbitEdit = (options?: UsePublishSubplebbitEditOptions): UsePublishSubplebbitEditResult => {
  const { subplebbitAddress, communityAddress, ...rest } = options || {};
  const result = usePublishCommunityEditBase({
    communityAddress: communityAddress || subplebbitAddress,
    ...rest,
  });

  return useMemo(
    () => ({
      ...result,
      publishSubplebbitEdit: result.publishCommunityEdit,
    }),
    [result],
  );
};

export const deleteSubplebbit = deleteCommunityBase;

export const setAccount = async (account: Account): Promise<void> => {
  await setAccountBase(normalizeAccountForSet(account));
};

export const useAccountComment = (options?: UseAccountCommentOptions): UseAccountCommentResult => {
  if (options?.commentIndex === undefined && options?.commentCid === undefined) {
    return {
      accountId: '',
      index: -1,
      state: 'initializing',
      error: undefined,
      errors: [],
      refresh: async () => {},
    };
  }

  const result = useAccountCommentBase(options);

  return useMemo(
    () => ({
      ...result,
      refresh: async () => {},
    }),
    [result],
  );
};
