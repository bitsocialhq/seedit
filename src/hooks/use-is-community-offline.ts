import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { Community } from '@bitsocial/bitsocial-react-hooks';
import { getFormattedTimeAgo } from '../lib/utils/time-utils';
import useCommunityOfflineStore from '../stores/use-community-offline-store';
import useCommunitiesLoadingStartTimestamps from '../stores/use-communities-loading-start-timestamps-store';

const useIsCommunityOffline = (community: Community) => {
  const { t } = useTranslation();
  const { address, state, updatedAt, updatingState } = community || {};
  const { communityOfflineState, setCommunityOfflineState, initializeCommunityOfflineState } = useCommunityOfflineStore();
  const communitiesLoadingStartTimestamps = useCommunitiesLoadingStartTimestamps([address]);

  useEffect(() => {
    if (address && !communityOfflineState[address]) {
      initializeCommunityOfflineState(address);
    }
  }, [address, communityOfflineState, initializeCommunityOfflineState]);

  useEffect(() => {
    if (address) {
      setCommunityOfflineState(address, { state, updatedAt, updatingState });
    }
  }, [address, state, updatedAt, updatingState, setCommunityOfflineState]);

  const communityOfflineStore = communityOfflineState[address] || { initialLoad: true };
  const loadingStartTimestamp = communitiesLoadingStartTimestamps[0] || 0;

  const isLoading = communityOfflineStore.initialLoad && (!updatedAt || Date.now() / 1000 - updatedAt >= 120 * 60) && Date.now() / 1000 - loadingStartTimestamp < 30;

  const isOffline = !isLoading && ((updatedAt && updatedAt < Date.now() / 1000 - 120 * 60) || (!updatedAt && Date.now() / 1000 - loadingStartTimestamp >= 30));

  const isOnline = updatedAt && Date.now() / 1000 - updatedAt < 120 * 60;

  const offlineTitle = isLoading
    ? t('loading')
    : updatedAt
      ? isOffline && t('posts_last_synced_info', { time: getFormattedTimeAgo(updatedAt), interpolation: { escapeValue: false } })
      : t('community_offline_info');

  // ensure isOffline is false until we have enough information
  const hasEnoughInfo = communityOfflineStore.initialLoad === false || updatedAt !== undefined;

  return {
    isOffline: hasEnoughInfo && !isOnline && isOffline,
    isOnlineStatusLoading: !isOnline && isLoading,
    offlineTitle,
  };
};

export default useIsCommunityOffline;
