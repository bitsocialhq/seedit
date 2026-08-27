import { create } from 'zustand';

interface ProgressiveFeedWindow {
  newerThan?: number;
}

interface ProgressiveFeedState {
  windows: Record<string, ProgressiveFeedWindow>;
  setWindow: (feedKey: string, newerThan?: number) => void;
}

const useProgressiveFeedStore = create<ProgressiveFeedState>((set) => ({
  windows: {},
  setWindow: (feedKey, newerThan) => set((state) => ({ windows: { ...state.windows, [feedKey]: { newerThan } } })),
}));

export default useProgressiveFeedStore;
