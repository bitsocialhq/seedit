import useContentOptionsStore from '../stores/use-content-options-store';
import useIsMobile from './use-is-mobile';

export const FEED_POSTS_PER_PAGE = 25;

export const getInfiniteFeedEnabled = (preference: boolean | null, isMobile: boolean) => preference ?? isMobile;

export const useInfiniteFeedEnabled = () => {
  const preference = useContentOptionsStore((state) => state.infiniteFeedEnabled);
  const isMobile = useIsMobile();
  return getInfiniteFeedEnabled(preference, isMobile);
};
