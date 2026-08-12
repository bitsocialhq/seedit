import { create } from 'zustand';

interface AutoExpandedTimeFilterState {
  // the time filter each feed view was expanded to, so it never expands again from the filter it landed on
  autoExpandedFeeds: Record<string, string>;
  setAutoExpandedFeed: (feedKey: string, timeFilterName: string) => void;
}

const useAutoExpandedTimeFilterStore = create<AutoExpandedTimeFilterState>((set) => ({
  autoExpandedFeeds: {},
  setAutoExpandedFeed: (feedKey, timeFilterName) => set((state) => ({ autoExpandedFeeds: { ...state.autoExpandedFeeds, [feedKey]: timeFilterName } })),
}));

export default useAutoExpandedTimeFilterStore;
