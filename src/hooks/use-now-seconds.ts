import { useEffect, useState } from 'react';

const STATUS_REFRESH_INTERVAL_MS = 30_000;

const getNowSeconds = () => Date.now() / 1000;

export const useNowSeconds = (enabled = true) => {
  const [nowSeconds, setNowSeconds] = useState(getNowSeconds);
  const [prevEnabled, setPrevEnabled] = useState(enabled);

  // Refresh during render when (re-)enabled, instead of via an effect, to avoid
  // an extra render showing a stale value. The interval keeps it fresh after.
  if (enabled !== prevEnabled) {
    setPrevEnabled(enabled);
    if (enabled) {
      setNowSeconds(getNowSeconds());
    }
  }

  useEffect(() => {
    if (!enabled) return;

    const interval = window.setInterval(() => setNowSeconds(getNowSeconds()), STATUS_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [enabled]);

  return nowSeconds;
};
