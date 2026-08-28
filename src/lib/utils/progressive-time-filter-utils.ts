export interface ProgressiveTimeWindow {
  name: '1w' | '1m' | '1y' | 'all';
  newerThan?: number;
}

export interface ProgressiveTimeWindowProbe extends ProgressiveTimeWindow {
  feedLength: number;
  settled: boolean;
}

const day = 60 * 60 * 24;

export const progressiveTimeWindows: ProgressiveTimeWindow[] = [
  { name: '1w', newerThan: 7 * day },
  { name: '1m', newerThan: 30 * day },
  { name: '1y', newerThan: 365 * day },
  { name: 'all' },
];

export const getWiderProgressiveTimeWindows = (currentNewerThan?: number): ProgressiveTimeWindow[] => {
  if (currentNewerThan === undefined) return [];
  return progressiveTimeWindows.filter(({ newerThan }) => newerThan === undefined || newerThan > currentNewerThan);
};

export const getAutomaticProgressiveTimeWindow = (
  currentNewerThan: number | undefined,
  currentFeedLength: number,
  targetFeedLength: number,
  probes: ProgressiveTimeWindowProbe[],
): ProgressiveTimeWindow | undefined => {
  const widerProbes = probes.filter(({ newerThan }) => newerThan === undefined || (currentNewerThan !== undefined && newerThan > currentNewerThan));
  if (currentNewerThan === undefined || widerProbes.length === 0 || currentFeedLength >= targetFeedLength) return undefined;

  const narrowestFullProbe = widerProbes.find(({ feedLength }) => feedLength >= targetFeedLength);
  if (narrowestFullProbe) return narrowestFullProbe;

  if (!widerProbes.every(({ settled }) => settled)) return undefined;

  return [...widerProbes].reverse().find(({ feedLength }) => feedLength > currentFeedLength) || widerProbes[widerProbes.length - 1];
};

export const getManualProgressiveTimeWindow = (
  currentNewerThan: number | undefined,
  currentFeedLength: number,
  probes: ProgressiveTimeWindowProbe[],
): ProgressiveTimeWindow | undefined => {
  const widerWindows = getWiderProgressiveTimeWindows(currentNewerThan);
  if (widerWindows.length === 0) return undefined;

  const widerProbes = probes.filter(({ newerThan }) => newerThan === undefined || (currentNewerThan !== undefined && newerThan > currentNewerThan));
  const probeWithMorePosts = widerProbes.find(({ feedLength }) => feedLength > currentFeedLength);
  if (probeWithMorePosts) return probeWithMorePosts;

  return widerProbes.length > 0 && widerProbes.every(({ settled }) => settled) ? widerProbes[widerProbes.length - 1] : widerWindows[0];
};
