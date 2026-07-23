// @vitest-environment jsdom

import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SubmitPage from './submit-page';
import useChallengesStore from '../../stores/use-challenges-store';
import usePublishPostStore from '../../stores/use-publish-post-store';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (callback: () => void | Promise<void>) => void | Promise<void> }).act as (callback: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  abandonPublish: vi.fn().mockResolvedValue(undefined),
  lastOptions: undefined as Record<string, any> | undefined,
}));

vi.mock('@bitsocial/bitsocial-react-hooks', () => ({
  useAccount: () => ({ subscriptions: [] }),
  useCommunity: () => ({ rules: [], title: 'Example' }),
  usePublishComment: (options: Record<string, any>) => {
    testState.lastOptions = options;
    return { abandonPublish: testState.abandonPublish, index: undefined, publishComment: vi.fn() };
  },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => 'web', isNativePlatform: () => false },
  registerPlugin: vi.fn(),
}));

vi.mock('../../plugins/file-uploader', () => ({
  default: { pickMedia: vi.fn(), uploadMedia: vi.fn() },
}));

vi.mock('react-dropzone', () => ({
  useDropzone: () => ({ getInputProps: () => ({}), getRootProps: () => ({}), isDragActive: false }),
}));

vi.mock('react-i18next', () => ({
  Trans: ({ values }: { values?: { link?: string } }) => createElement('span', null, values?.link),
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('react-router-dom', () => ({
  Link: ({ children }: { children?: React.ReactNode }) => createElement('a', null, children),
  useNavigate: () => vi.fn(),
}));

vi.mock('../../hooks/use-default-subscriptions', () => ({
  useDefaultSubscriptionAddresses: () => [],
}));

vi.mock('../../hooks/use-is-community-offline', () => ({
  default: () => ({ isOffline: false, offlineTitle: '' }),
}));

vi.mock('../../hooks/use-resolved-community-route', () => ({
  default: () => ({ communityAddress: 'example.bso' }),
}));

vi.mock('../../lib/utils/media-utils', () => ({ getLinkMediaInfo: () => undefined }));
vi.mock('../../components/info-tooltip', () => ({ default: () => null }));
vi.mock('../../components/loading-ellipsis', () => ({ default: () => null }));
vi.mock('../../components/markdown', () => ({ default: () => null }));
vi.mock('../../components/post/embed', () => ({ default: () => null }));
vi.mock('../../components/reply-form/reply-form', () => ({ FormattingHelpTable: () => null }));

let container: HTMLDivElement;
let root: Root;

describe('SubmitPage challenge cancellation', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    testState.lastOptions = undefined;
    useChallengesStore.setState({ challenges: [] });
    usePublishPostStore.getState().resetPublishPostStore();
    vi.stubGlobal('scrollTo', vi.fn());
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(createElement(SubmitPage));
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    useChallengesStore.setState({ challenges: [] });
    usePublishPostStore.getState().resetPublishPostStore();
    vi.unstubAllGlobals();
  });

  it('routes challenge cancellation to the current usePublishComment abandonPublish', async () => {
    await act(async () => {
      await testState.lastOptions?.onChallenge({ challenges: [] }, { title: 'Test post' });
    });

    expect(useChallengesStore.getState().challenges).toHaveLength(1);

    await act(async () => {
      await useChallengesStore.getState().abandonCurrentChallenge();
    });

    expect(testState.abandonPublish).toHaveBeenCalledOnce();
  });
});
