import { useCallback, useEffect, useRef } from 'react';

/**
 * A hook for managing scheduled state resets with automatic cleanup.
 * Useful for temporary UI feedback (e.g., "copied!" messages that auto-dismiss).
 *
 * @param callback - The function to call when the timeout fires
 * @param delay - The delay in milliseconds before the callback is called
 * @returns [scheduleReset, clearReset] - Functions to schedule or cancel the reset
 */
const useScheduledReset = (callback: () => void, delay: number): [() => void, () => void] => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearReset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const scheduleReset = useCallback(() => {
    clearReset();
    timeoutRef.current = setTimeout(() => {
      callback();
      timeoutRef.current = null;
    }, delay);
  }, [callback, delay, clearReset]);

  // Cleanup on unmount
  useEffect(() => clearReset, [clearReset]);

  return [scheduleReset, clearReset];
};

export default useScheduledReset;
