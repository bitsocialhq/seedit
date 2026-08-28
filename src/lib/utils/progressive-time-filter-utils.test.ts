import { describe, expect, it } from 'vitest';
import {
  getAutomaticProgressiveTimeWindow,
  getManualProgressiveTimeWindow,
  getWiderProgressiveTimeWindows,
  type ProgressiveTimeWindowProbe,
} from './progressive-time-filter-utils';

const day = 60 * 60 * 24;
const probe = (name: ProgressiveTimeWindowProbe['name'], newerThan: number | undefined, feedLength: number, settled = true): ProgressiveTimeWindowProbe => ({
  name,
  newerThan,
  feedLength,
  settled,
});

describe('progressive time windows', () => {
  it('supports dynamic last-visit windows and stops after all time', () => {
    expect(getWiderProgressiveTimeWindows(21 * day).map(({ name }) => name)).toEqual(['1m', '1y', 'all']);
    expect(getWiderProgressiveTimeWindows(undefined)).toEqual([]);
  });

  it('automatically picks the narrowest background probe that fills the first page', () => {
    expect(
      getAutomaticProgressiveTimeWindow(1 * day, 4, 25, [probe('1w', 7 * day, 25, false), probe('1m', 30 * day, 40, false), probe('all', undefined, 80, false)]),
    ).toMatchObject({ name: '1w' });
  });

  it('waits for sparse probes to settle before choosing the broadest useful window', () => {
    const loadingProbes = [probe('1w', 7 * day, 5), probe('1m', 30 * day, 9, false), probe('all', undefined, 12, false)];
    expect(getAutomaticProgressiveTimeWindow(1 * day, 4, 25, loadingProbes)).toBeUndefined();

    const settledProbes = loadingProbes.map((item) => ({ ...item, settled: true }));
    expect(getAutomaticProgressiveTimeWindow(1 * day, 4, 25, settledProbes)).toMatchObject({ name: 'all' });
  });

  it('settles at all time even when broader probes contain no additional posts', () => {
    expect(getAutomaticProgressiveTimeWindow(1 * day, 0, 25, [probe('1w', 7 * day, 0), probe('all', undefined, 0)])).toMatchObject({ name: 'all' });
  });

  it('uses a ready background probe with more posts for manual loading', () => {
    expect(getManualProgressiveTimeWindow(1 * day, 25, [probe('1w', 7 * day, 25), probe('1m', 30 * day, 31), probe('all', undefined, 60)])).toMatchObject({
      name: '1m',
    });
  });

  it('settles directly at all time when every wider probe is exhausted without more posts', () => {
    expect(getManualProgressiveTimeWindow(30 * day, 29, [probe('1y', 365 * day, 29), probe('all', undefined, 29)])).toMatchObject({ name: 'all' });
  });
});
