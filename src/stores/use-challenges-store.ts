import { create } from 'zustand';
import { Challenge } from '@bitsocial/bitsocial-react-hooks';

export interface ChallengeEntry {
  challenge: Challenge;
  id: number;
  onAbandon?: () => Promise<void> | void;
}

let nextChallengeId = 0;

interface State {
  challenges: ChallengeEntry[];
  addChallenge: (challenge: Challenge, onAbandon?: () => Promise<void> | void) => void;
  removeChallenge: () => void;
  abandonCurrentChallenge: () => Promise<void>;
}

const useChallengesStore = create<State>((set, get) => ({
  challenges: [],
  addChallenge: (challenge, onAbandon) => {
    set((state) => ({ challenges: [...state.challenges, { challenge, id: nextChallengeId++, onAbandon }] }));
  },
  removeChallenge: () => {
    set((state) => {
      const challenges = [...state.challenges];
      challenges.shift();
      return { challenges };
    });
  },
  abandonCurrentChallenge: async () => {
    const currentChallenge = get().challenges[0];
    get().removeChallenge();

    try {
      if (currentChallenge?.onAbandon) {
        await currentChallenge.onAbandon();
      } else if (typeof currentChallenge?.challenge?.[1]?.stop === 'function') {
        await currentChallenge.challenge[1].stop();
      }
    } catch (error) {
      console.error('Failed to abandon challenge publication:', error);
    }
  },
}));

export default useChallengesStore;
