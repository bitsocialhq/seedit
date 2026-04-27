import { usePkcRpcSettings } from '@bitsocial/bitsocial-react-hooks';

const useChallengeSettings = (challengeName: string) => {
  const { challenges } = usePkcRpcSettings().pkcRpcSettings || {};
  if (challenges) {
    return challenges[challengeName] || {};
  }
};

export default useChallengeSettings;
