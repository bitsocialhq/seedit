import { useEffect, useRef } from 'react';

interface UseSuggestionFeedLoaderOptions {
  feedLength: number;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  requestKey: string;
  shouldLoad: boolean;
  targetFeedLength: number;
}

const useSuggestionFeedLoader = ({ feedLength, hasMore, loadMore, requestKey, shouldLoad, targetFeedLength }: UseSuggestionFeedLoaderOptions) => {
  const lastRequestKeyRef = useRef('');

  useEffect(() => {
    if (!shouldLoad || !requestKey || !hasMore || feedLength >= targetFeedLength) {
      lastRequestKeyRef.current = '';
      return;
    }

    const nextRequestKey = `${requestKey}:${feedLength}:${targetFeedLength}`;
    if (lastRequestKeyRef.current === nextRequestKey) return;

    lastRequestKeyRef.current = nextRequestKey;
    void loadMore();
  }, [feedLength, hasMore, loadMore, requestKey, shouldLoad, targetFeedLength]);
};

export default useSuggestionFeedLoader;
