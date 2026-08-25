import { usePkcRpcSettings } from '@bitsocial/bitsocial-react-hooks';

const useChallengesOptions = () => {
  const { challenges } = usePkcRpcSettings().pkcRpcSettings || {};

  const options = Object.entries(challenges ?? {}).reduce(
    (acc, [challengeName, challengeSettings]) => {
      acc[challengeName] = (challengeSettings.optionInputs ?? []).reduce((optionsAcc: any, input: any) => {
        optionsAcc[input.option] = input.default || '';
        return optionsAcc;
      }, {});
      return acc;
    },
    {} as Record<string, Record<string, string>>,
  );

  return options;
};

export default useChallengesOptions;
