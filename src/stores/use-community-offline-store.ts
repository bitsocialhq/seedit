import { create } from 'zustand';

interface CommunityOfflineState {
  state?: string;
  updatedAt?: number;
  updatingState?: string;
  initialLoad: boolean;
}

interface CommunityOfflineStore {
  communityOfflineState: Record<string, CommunityOfflineState>;
  setCommunityOfflineState: (address: string, state: Partial<CommunityOfflineState>) => void;
  initializeCommunityOfflineState: (address: string) => void;
}

const useCommunityOfflineStore = create<CommunityOfflineStore>((set) => ({
  communityOfflineState: {},
  setCommunityOfflineState: (address, newState) =>
    set((state) => ({
      communityOfflineState: {
        ...state.communityOfflineState,
        [address]: {
          ...state.communityOfflineState[address],
          ...newState,
        },
      },
    })),
  initializeCommunityOfflineState: (address) => {
    set((state) => ({
      communityOfflineState: {
        ...state.communityOfflineState,
        [address]: {
          initialLoad: true,
        },
      },
    }));
    setTimeout(() => {
      set((state) => ({
        communityOfflineState: {
          ...state.communityOfflineState,
          [address]: {
            ...state.communityOfflineState[address],
            initialLoad: false,
          },
        },
      }));
    }, 30000);
  },
}));

export default useCommunityOfflineStore;
