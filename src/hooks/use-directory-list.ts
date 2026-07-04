import { useEffect, useMemo, useState } from 'react';
import { type DirectoryList, normalizeDirectoryList } from '../lib/utils/directory-list-utils';
import { getVendoredDirectoryList, vendoredDirectoryDefaults } from '../data/vendored-directory-lists';

interface DirectoryListState {
  list: DirectoryList | null;
  loading: boolean;
  error: Error | null;
}

interface DirectoryListsState {
  listsByCode: Record<string, DirectoryList | null>;
  loadingByCode: Record<string, boolean>;
  errorsByCode: Record<string, Error | null>;
}

const GITHUB_URL_TEMPLATE = 'https://raw.githubusercontent.com/bitsocialnet/lists/master/seedit-directories/seedit-{code}-directory.json';
const LOCALSTORAGE_KEY_PREFIX = 'seedit-directory-list-cache:';
const LOCALSTORAGE_TIMESTAMP_KEY_PREFIX = 'seedit-directory-list-cache-timestamp:';
const CACHE_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour
const FETCH_RETRY_DELAY_MS = 60 * 1000; // 1 minute
const FETCH_TIMEOUT_MS = 10 * 1000;

// Per-code module caches keyed by directory code (e.g. 'memes').
const moduleCaches = new Map<string, DirectoryList>();
const inFlightFetches = new Map<string, Promise<DirectoryList | null>>();
const lastFetchSuccessAt = new Map<string, number>();
const lastFetchAttemptAt = new Map<string, number>();

const getLocalStorageKey = (code: string) => `${LOCALSTORAGE_KEY_PREFIX}${code}`;
const getLocalStorageTimestampKey = (code: string) => `${LOCALSTORAGE_TIMESTAMP_KEY_PREFIX}${code}`;

// Normalize with the vendored defaults so remote lists get the shared title/tags metadata.
const normalizeWithDefaults = (raw: unknown, code: string): DirectoryList | null => normalizeDirectoryList(raw, code, vendoredDirectoryDefaults);

const getFromLocalStorage = (code: string): DirectoryList | null => {
  try {
    const cached = localStorage.getItem(getLocalStorageKey(code));
    const timestamp = localStorage.getItem(getLocalStorageTimestampKey(code));
    if (cached && timestamp) {
      const age = Date.now() - parseInt(timestamp, 10);
      if (age < CACHE_MAX_AGE_MS) {
        const parsed = JSON.parse(cached);
        const normalized = normalizeWithDefaults(parsed, code);
        if (normalized) return normalized;
        localStorage.removeItem(getLocalStorageKey(code));
        localStorage.removeItem(getLocalStorageTimestampKey(code));
      }
    }
  } catch (e) {
    console.warn(`Failed to read directory list "${code}" from localStorage:`, e);
  }
  return null;
};

const saveToLocalStorage = (code: string, data: DirectoryList) => {
  try {
    localStorage.setItem(getLocalStorageKey(code), JSON.stringify(data));
    localStorage.setItem(getLocalStorageTimestampKey(code), Date.now().toString());
  } catch (e) {
    console.warn(`Failed to save directory list "${code}" to localStorage:`, e);
  }
};

const shouldRefreshFromGitHub = (code: string): boolean => {
  const now = Date.now();
  const lastSuccess = lastFetchSuccessAt.get(code);
  if (lastSuccess !== undefined && now - lastSuccess < CACHE_MAX_AGE_MS) {
    return false;
  }
  const lastAttempt = lastFetchAttemptAt.get(code);
  if (lastAttempt !== undefined && now - lastAttempt < FETCH_RETRY_DELAY_MS) {
    return false;
  }
  return true;
};

const fetchDirectoryListFromGitHub = async (code: string): Promise<DirectoryList | null> => {
  const url = GITHUB_URL_TEMPLATE.replace('{code}', code);
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, { cache: 'no-cache', signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
  if (response.status === 404) {
    // Not yet published; treat as missing — caller will fall back to the vendored list.
    return null;
  }
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const normalized = normalizeWithDefaults(await response.json(), code);
  if (!normalized) {
    throw new Error(`Invalid directory list payload for ${code}`);
  }
  moduleCaches.set(code, normalized);
  lastFetchSuccessAt.set(code, Date.now());
  saveToLocalStorage(code, normalized);
  return normalized;
};

const fetchDirectoryListDeduped = (code: string): Promise<DirectoryList | null> => {
  const existing = inFlightFetches.get(code);
  if (existing) return existing;

  if (!shouldRefreshFromGitHub(code)) {
    return Promise.resolve(null);
  }

  lastFetchAttemptAt.set(code, Date.now());
  const promise = fetchDirectoryListFromGitHub(code).finally(() => {
    inFlightFetches.delete(code);
  });
  inFlightFetches.set(code, promise);
  return promise;
};

/**
 * Fetch the candidate communities for a single directory code (e.g. 'memes').
 *
 * Source: `bitsocialnet/lists/seedit-directories/seedit-{code}-directory.json`. While the
 * network is unavailable or the remote file is still loading, falls back to the vendored
 * list generated from that repo by `yarn sync:directories`.
 */
export const useDirectoryList = (directoryCode: string | undefined): DirectoryListState => {
  const fallback = useMemo(() => (directoryCode ? getVendoredDirectoryList(directoryCode) : null), [directoryCode]);

  const [state, setState] = useState<DirectoryListState>(() => {
    if (!directoryCode) {
      return { list: null, loading: false, error: null };
    }
    const cached = moduleCaches.get(directoryCode);
    if (cached) {
      return { list: cached, loading: false, error: null };
    }
    return { list: fallback, loading: true, error: null };
  });

  useEffect(() => {
    if (!directoryCode) {
      setState({ list: null, loading: false, error: null });
      return;
    }

    let isMounted = true;

    const hydrate = (list: DirectoryList) => {
      moduleCaches.set(directoryCode, list);
      if (isMounted) {
        setState({ list, loading: false, error: null });
      }
    };

    (async () => {
      const cached = moduleCaches.get(directoryCode);
      if (cached) {
        setState({ list: cached, loading: false, error: null });
      } else {
        const local = getFromLocalStorage(directoryCode);
        if (local) {
          hydrate(local);
        } else if (fallback) {
          setState({ list: fallback, loading: true, error: null });
        }
      }

      try {
        const fetched = await fetchDirectoryListDeduped(directoryCode);
        if (fetched) {
          hydrate(fetched);
        } else if (!moduleCaches.get(directoryCode) && fallback) {
          if (isMounted) {
            setState({ list: fallback, loading: false, error: null });
          }
        } else if (isMounted) {
          // Stop the loading indicator once the fetch resolves (even if it returned null).
          setState((prev) => ({ ...prev, loading: false }));
        }
      } catch (error) {
        console.warn(`Failed to fetch directory list "${directoryCode}":`, error);
        if (!isMounted) return;
        const cachedAfter = moduleCaches.get(directoryCode);
        if (cachedAfter) {
          setState({ list: cachedAfter, loading: false, error: null });
        } else if (fallback) {
          setState({ list: fallback, loading: false, error: error instanceof Error ? error : new Error(String(error)) });
        } else {
          setState({ list: null, loading: false, error: error instanceof Error ? error : new Error(String(error)) });
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [directoryCode, fallback]);

  return state;
};

export const useDirectoryLists = (directoryCodes: string[] | undefined): DirectoryListsState => {
  const directoryCodesKey = useMemo(() => [...new Set(directoryCodes ?? [])].join('\0'), [directoryCodes]);

  const [state, setState] = useState<DirectoryListsState>({
    listsByCode: {},
    loadingByCode: {},
    errorsByCode: {},
  });

  useEffect(() => {
    const normalizedDirectoryCodes = directoryCodesKey ? directoryCodesKey.split('\0') : [];
    if (normalizedDirectoryCodes.length === 0) {
      setState({
        listsByCode: {},
        loadingByCode: {},
        errorsByCode: {},
      });
      return;
    }

    let isMounted = true;
    const initialState = normalizedDirectoryCodes.reduce<DirectoryListsState>(
      (acc, directoryCode) => {
        const cached = moduleCaches.get(directoryCode);
        const local = cached ? null : getFromLocalStorage(directoryCode);
        const list = cached ?? local ?? getVendoredDirectoryList(directoryCode);

        if (local) {
          moduleCaches.set(directoryCode, local);
        }

        acc.listsByCode[directoryCode] = list;
        acc.loadingByCode[directoryCode] = !cached && !local;
        acc.errorsByCode[directoryCode] = null;
        return acc;
      },
      {
        listsByCode: {},
        loadingByCode: {},
        errorsByCode: {},
      },
    );

    setState(initialState);

    normalizedDirectoryCodes.forEach((directoryCode) => {
      fetchDirectoryListDeduped(directoryCode)
        .then((fetched) => {
          if (!isMounted) return;
          const list = fetched ?? moduleCaches.get(directoryCode) ?? getVendoredDirectoryList(directoryCode);
          setState((prev) => ({
            listsByCode: { ...prev.listsByCode, [directoryCode]: list },
            loadingByCode: { ...prev.loadingByCode, [directoryCode]: false },
            errorsByCode: { ...prev.errorsByCode, [directoryCode]: null },
          }));
        })
        .catch((error) => {
          console.warn(`Failed to fetch directory list "${directoryCode}":`, error);
          if (!isMounted) return;
          const cachedAfter = moduleCaches.get(directoryCode);
          setState((prev) => ({
            listsByCode: { ...prev.listsByCode, [directoryCode]: cachedAfter ?? getVendoredDirectoryList(directoryCode) },
            loadingByCode: { ...prev.loadingByCode, [directoryCode]: false },
            errorsByCode: { ...prev.errorsByCode, [directoryCode]: error instanceof Error ? error : new Error(String(error)) },
          }));
        });
    });

    return () => {
      isMounted = false;
    };
  }, [directoryCodesKey]);

  return state;
};
