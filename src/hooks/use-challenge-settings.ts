import { usePlebbitRpcSettings } from '@bitsocial/bitsocial-react-hooks';

const useChallengeSettings = (challengeName: string) => {
  const { challenges } = usePlebbitRpcSettings().plebbitRpcSettings || {};
  if (challenges) {
    return challenges[challengeName] || {};
  }
};

export default useChallengeSettings;
