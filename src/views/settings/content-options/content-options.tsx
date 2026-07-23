import { useTranslation } from 'react-i18next';
import { useAccount } from '@bitsocial/bitsocial-react-hooks';
import styles from './content-options.module.css';
import useContentOptionsStore from '../../../stores/use-content-options-store';
import { useDefaultSubscriptions } from '../../../hooks/use-default-subscriptions';
import { handleNSFWSubscriptionPrompt } from '../../../lib/utils/nsfw-subscription-utils';
import { useInfiniteFeedEnabled } from '../../../hooks/use-feed-pagination';

const MediaOptions = () => {
  const { t } = useTranslation();
  const {
    blurNsfwThumbnails,
    setBlurNsfwThumbnails,
    thumbnailDisplayOption,
    setThumbnailDisplayOption,
    mediaPreviewOption,
    setMediaPreviewOption,
    autoplayVideosOnComments,
    setAutoplayVideosOnComments,
    muteVideosOnComments,
    setMuteVideosOnComments,
  } = useContentOptionsStore();

  return (
    <div className={styles.contentOptions}>
      <div className={styles.contentOptionTitle}>thumbnails</div>
      <div>
        <label>
          <input type='radio' name='thumbnailOption' value='show' checked={thumbnailDisplayOption === 'show'} onChange={() => setThumbnailDisplayOption('show')} />
          {t('show_thumbnails_next_to_links')}
        </label>
      </div>
      <div>
        <label>
          <input type='radio' name='thumbnailOption' value='hide' checked={thumbnailDisplayOption === 'hide'} onChange={() => setThumbnailDisplayOption('hide')} />
          {t('dont_show_thumbnails_next_to_links')}
        </label>
      </div>
      <div>
        <label
          style={{ cursor: 'not-allowed' }}
          onClick={(e) => {
            e.preventDefault();
            window.alert('This feature is not available yet');
          }}
        >
          <input
            type='radio'
            name='thumbnailOption'
            value='community'
            checked={thumbnailDisplayOption === 'community'}
            onChange={() => setThumbnailDisplayOption('community')}
            disabled
          />
          {t('show_thumbnails_based_on_community_media_preferences')}
        </label>
      </div>
      <br />
      <div className={styles.contentOptionTitle}>{t('media_previews')}</div>
      <div>
        <label>
          <input
            type='radio'
            name='mediaPreviewOption'
            value='autoExpandAll'
            checked={mediaPreviewOption === 'autoExpandAll'}
            onChange={() => setMediaPreviewOption('autoExpandAll')}
          />
          {t('auto_expand_media_previews')}
        </label>
      </div>
      <div>
        <label>
          <input
            type='radio'
            name='mediaPreviewOption'
            value='autoExpandExceptComments'
            checked={mediaPreviewOption === 'autoExpandExceptComments'}
            onChange={() => setMediaPreviewOption('autoExpandExceptComments')}
          />
          {t('dont_auto_expand_media_previews_on_comments_pages')}
        </label>
      </div>
      <div>
        <label
          style={{ cursor: 'not-allowed' }}
          onClick={(e) => {
            e.preventDefault();
            window.alert('This feature is not available yet');
          }}
        >
          <input
            type='radio'
            name='mediaPreviewOption'
            value='community'
            checked={mediaPreviewOption === 'community'}
            onChange={() => setMediaPreviewOption('community')}
            disabled
          />
          {t('expand_media_previews_based_on_community_media_preferences')}
        </label>
      </div>
      <br />
      <div className={styles.contentOptionTitle}>{t('video_player')}</div>
      <div>
        <label>
          <input type='checkbox' checked={autoplayVideosOnComments} onChange={(e) => setAutoplayVideosOnComments(e.target.checked)} />
          {t('autoplay_videos_on_comments_page')}
        </label>
      </div>
      <div>
        <label>
          <input type='checkbox' checked={muteVideosOnComments} onChange={(e) => setMuteVideosOnComments(e.target.checked)} />
          {t('mute_videos_by_default')}
        </label>
      </div>
      <br />
      <div className={styles.contentOptionTitle}>{t('nsfw_content')}</div>
      <div>
        <label>
          <input type='checkbox' checked={blurNsfwThumbnails} onChange={(e) => setBlurNsfwThumbnails(e.target.checked)} />
          {t('blur_media')}
        </label>
      </div>
    </div>
  );
};

const CommunitiesOptions = () => {
  const { t } = useTranslation();
  const account = useAccount();
  const defaultCommunities = useDefaultSubscriptions();
  const { hideNsfwCommunities, setHideNsfwCommunities, hideDefaultCommunities, setHideDefaultCommunities } = useContentOptionsStore();

  return (
    <div className={styles.contentOptions}>
      <div className={styles.contentOptionTitle}>{t('default_communities')}</div>
      <div>
        <label>
          <input
            type='checkbox'
            checked={hideNsfwCommunities}
            onChange={async (e) => {
              const newValue = e.target.checked;

              // If showing (newValue = false), handle subscription prompt
              if (!newValue) {
                await handleNSFWSubscriptionPrompt({ account, defaultCommunities });
              }

              setHideNsfwCommunities(newValue);
            }}
          />
          {t('hide_communities_tagged_as_nsfw')}
        </label>
      </div>
      <br />
      <div className={styles.contentOptionTitle}>topbar</div>
      <label>
        <input type='checkbox' checked={hideDefaultCommunities} onChange={(e) => setHideDefaultCommunities(e.target.checked)} />
        {t('hide_default_communities_from_topbar')}
      </label>
    </div>
  );
};

const FeedOptions = () => {
  const { t } = useTranslation();
  const infiniteFeedEnabled = useInfiniteFeedEnabled();
  const setInfiniteFeedEnabled = useContentOptionsStore((state) => state.setInfiniteFeedEnabled);

  return (
    <div className={styles.contentOptions}>
      <label>
        <input type='checkbox' checked={infiniteFeedEnabled} onChange={(event) => setInfiniteFeedEnabled(event.target.checked)} />
        {t('enable_infinite_feed')}
      </label>
    </div>
  );
};

const ContentOptions = () => {
  const { t } = useTranslation();

  return (
    <div className={styles.content}>
      <div className={styles.category}>
        <span className={styles.categoryTitle}>{t('media')}</span>
        <span className={styles.categorySettings}>
          <MediaOptions />
        </span>
      </div>
      <div className={styles.category}>
        <span className={styles.categoryTitle}>{t('communities')}</span>
        <span className={styles.categorySettings}>
          <CommunitiesOptions />
        </span>
      </div>
      <div className={styles.category}>
        <span className={styles.categoryTitle}>{t('feeds')}</span>
        <span className={styles.categorySettings}>
          <FeedOptions />
        </span>
      </div>
    </div>
  );
};

export default ContentOptions;
