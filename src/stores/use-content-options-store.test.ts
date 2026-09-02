import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createStorage = () => {
  const values = new Map<string, string>();
  return {
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
  } satisfies Storage;
};

describe('useContentOptionsStore', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('localStorage', createStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defaults infinite feed to the responsive policy and persists explicit changes', async () => {
    const { default: useContentOptionsStore } = await import('./use-content-options-store');

    expect(useContentOptionsStore.getState().infiniteFeedEnabled).toBeNull();
    expect(useContentOptionsStore.getState().autoHideTopbar).toBeNull();

    useContentOptionsStore.getState().setInfiniteFeedEnabled(true);
    useContentOptionsStore.getState().setAutoHideTopbar(false);

    expect(useContentOptionsStore.getState().infiniteFeedEnabled).toBe(true);
    expect(useContentOptionsStore.getState().autoHideTopbar).toBe(false);
    expect(localStorage.getItem('content-options')).toContain('"infiniteFeedEnabled":true');
    expect(localStorage.getItem('content-options')).toContain('"autoHideTopbar":false');
  });
});
