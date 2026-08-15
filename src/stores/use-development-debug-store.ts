import { create } from 'zustand';

export const DEVELOPMENT_DEBUG_STORAGE_KEY = 'development-debug:v1';

export interface DevelopmentDebugPreferences {
  mockContentEnabled: boolean;
  showFeedResetButton: boolean;
}

interface DevelopmentDebugStore extends DevelopmentDebugPreferences {
  setMockContentEnabled: (enabled: boolean) => void;
  setShowFeedResetButton: (show: boolean) => void;
}

const defaultPreferences: DevelopmentDebugPreferences = {
  mockContentEnabled: false,
  showFeedResetButton: false,
};

export const getDevelopmentDebugPreferences = (): DevelopmentDebugPreferences => {
  try {
    const storedPreferences = JSON.parse(localStorage.getItem(DEVELOPMENT_DEBUG_STORAGE_KEY) ?? '{}') as Partial<DevelopmentDebugPreferences>;
    return {
      mockContentEnabled: storedPreferences.mockContentEnabled === true,
      showFeedResetButton: storedPreferences.showFeedResetButton === true,
    };
  } catch {
    return defaultPreferences;
  }
};

const saveDevelopmentDebugPreferences = (preferences: DevelopmentDebugPreferences) => {
  try {
    localStorage.setItem(DEVELOPMENT_DEBUG_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Debug preferences can remain session-local when browser storage is unavailable.
  }
};

const useDevelopmentDebugStore = create<DevelopmentDebugStore>((set) => ({
  ...getDevelopmentDebugPreferences(),
  setMockContentEnabled: (mockContentEnabled) =>
    set((state) => {
      const preferences = { mockContentEnabled, showFeedResetButton: state.showFeedResetButton };
      saveDevelopmentDebugPreferences(preferences);
      return preferences;
    }),
  setShowFeedResetButton: (showFeedResetButton) =>
    set((state) => {
      const preferences = { mockContentEnabled: state.mockContentEnabled, showFeedResetButton };
      saveDevelopmentDebugPreferences(preferences);
      return preferences;
    }),
}));

export default useDevelopmentDebugStore;
