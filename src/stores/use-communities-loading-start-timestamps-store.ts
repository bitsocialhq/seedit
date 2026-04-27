import { useEffect, useMemo } from 'react';
import { create } from 'zustand';

interface CommunitiesLoadingStartTimestampsState {
  timestamps: Record<string, number>;
  addCommunities: (communityAddresses: string[]) => void;
}

const useCommunitiesLoadingStartTimestampsStore = create<CommunitiesLoadingStartTimestampsState>((set, get) => ({
  timestamps: {},
  addCommunities: (communityAddresses) => {
    const { timestamps } = get();
    const newTimestamps: Record<string, number> = {};
    communityAddresses.forEach((communityAddress) => {
      if (!timestamps[communityAddress]) {
        newTimestamps[communityAddress] = Math.round(Date.now() / 1000);
      }
    });
    if (Object.keys(newTimestamps).length) {
      set((state) => ({ timestamps: { ...state.timestamps, ...newTimestamps } }));
    }
  },
}));

const useCommunitiesLoadingStartTimestamps = (communityAddresses?: string[]) => {
  const timestampsStore = useCommunitiesLoadingStartTimestampsStore((state) => state.timestamps);
  const addCommunities = useCommunitiesLoadingStartTimestampsStore((state) => state.addCommunities);

  useEffect(() => {
    if (communityAddresses) {
      addCommunities(communityAddresses);
    }
  }, [communityAddresses, addCommunities]);

  const communitiesLoadingStartTimestamps = useMemo(() => {
    return communityAddresses?.map((communityAddress) => timestampsStore[communityAddress]) || [];
  }, [timestampsStore, communityAddresses]);

  return communitiesLoadingStartTimestamps;
};

export default useCommunitiesLoadingStartTimestamps;
