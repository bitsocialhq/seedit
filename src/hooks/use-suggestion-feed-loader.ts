import { useEffect, useReducer, useRef, useState } from 'react';

interface UseSuggestionFeedLoaderOptions {
  feedLength: number;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  requestKey: string;
  shouldLoad: boolean;
  targetFeedLength: number;
}

const initialRetryDelayMs = 1_000;
const maximumRetryDelayMs = 30_000;
const getRetryDelayMs = (attempt: number) => Math.min(initialRetryDelayMs * 2 ** Math.min(attempt, 5), maximumRetryDelayMs);

const useSuggestionFeedLoader = ({ feedLength, hasMore, loadMore, requestKey, shouldLoad, targetFeedLength }: UseSuggestionFeedLoaderOptions) => {
  const [retryVersion, requestRetry] = useReducer((version: number) => version + 1, 0);
  const [pendingRetry, setPendingRetry] = useState<{ delayMs: number; requestId: number; requestKey: string }>();
  const activeRequestRef = useRef<{ id: number; key: string } | undefined>(undefined);
  const latestRequestKeyRef = useRef('');
  const mountedRef = useRef(false);
  const nextRequestIdRef = useRef(0);
  const retryStateRef = useRef({ attempt: 0, key: '' });
  const canLoad = shouldLoad && Boolean(requestKey) && hasMore && feedLength < targetFeedLength;
  const nextRequestKey = canLoad ? `${requestKey}:${feedLength}:${targetFeedLength}` : '';

  useEffect(() => {
    latestRequestKeyRef.current = nextRequestKey;
  }, [nextRequestKey]);

  useEffect(() => {
    if (!nextRequestKey) {
      activeRequestRef.current = undefined;
      retryStateRef.current = { attempt: 0, key: '' };
      return;
    }

    if (activeRequestRef.current) return;

    const retryAttempt = retryStateRef.current.key === nextRequestKey ? retryStateRef.current.attempt : 0;
    const request = { id: ++nextRequestIdRef.current, key: nextRequestKey };
    activeRequestRef.current = request;

    void Promise.resolve()
      .then(loadMore)
      .catch(() => undefined)
      .finally(() => {
        if (!mountedRef.current) return;
        if (activeRequestRef.current?.id !== request.id) return;

        const latestRequestKey = latestRequestKeyRef.current;
        if (!latestRequestKey) {
          activeRequestRef.current = undefined;
          retryStateRef.current = { attempt: 0, key: '' };
          return;
        }

        // Filtered or duplicate pages can load without changing the visible feed. Keep advancing them, but back off while the observable key is unchanged.
        const madeProgress = latestRequestKey !== request.key;
        retryStateRef.current = madeProgress ? { attempt: 0, key: latestRequestKey } : { attempt: retryAttempt + 1, key: request.key };
        setPendingRetry({ delayMs: madeProgress ? 0 : getRetryDelayMs(retryAttempt), requestId: request.id, requestKey: latestRequestKey });
      });
  }, [loadMore, nextRequestKey, retryVersion]);

  useEffect(() => {
    if (!pendingRetry || !nextRequestKey) return;

    const timeout = setTimeout(
      () => {
        setPendingRetry(undefined);
        if (activeRequestRef.current?.id !== pendingRetry.requestId) return;
        activeRequestRef.current = undefined;
        requestRetry();
      },
      pendingRetry.requestKey === nextRequestKey ? pendingRetry.delayMs : 0,
    );
    return () => clearTimeout(timeout);
  }, [nextRequestKey, pendingRetry]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
};

export default useSuggestionFeedLoader;
