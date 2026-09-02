import useContentOptionsStore from '../stores/use-content-options-store';
import { useInfiniteFeedEnabled } from './use-feed-pagination';

export const getTopbarAutoHideEnabled = (preference: boolean | null, infiniteFeedEnabled: boolean) => infiniteFeedEnabled && (preference ?? true);

export const useTopbarAutoHideEnabled = () => {
  const preference = useContentOptionsStore((state) => state.autoHideTopbar);
  const infiniteFeedEnabled = useInfiniteFeedEnabled();
  return getTopbarAutoHideEnabled(preference, infiniteFeedEnabled);
};
