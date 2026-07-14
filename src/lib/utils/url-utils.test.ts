import { describe, expect, it } from 'vitest';
import { isSeeditLink, isValidCommunityPattern, preprocessSeeditPatterns, transformSeeditLinkToInternal } from './url-utils';

const CID = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3fteh2v6q2f6x2w4g3q';

describe('Seedit comments permalinks', () => {
  it('recognizes direct, hash-routed, and short-host comments URLs', () => {
    expect(isSeeditLink(`https://seedit.app/s/aww/comments/${CID}`)).toBe(true);
    expect(isSeeditLink(`https://seedit.app/#/s/aww/comments/${CID}`)).toBe(true);
    expect(isSeeditLink(`https://pleb.bz/s/aww/comments/${CID}`)).toBe(true);
  });

  it('transforms external comments URLs to the matching internal route', () => {
    expect(transformSeeditLinkToInternal(`https://seedit.app/s/aww/comments/${CID}`)).toBe(`/s/aww/comments/${CID}`);
    expect(transformSeeditLinkToInternal(`https://seedit.app/#/s/aww/comments/${CID}`)).toBe(`/s/aww/comments/${CID}`);
  });

  it('recognizes and links plain-text comments permalinks', () => {
    const pattern = `s/aww.bso/comments/${CID}`;
    expect(isValidCommunityPattern(pattern)).toBe(true);
    expect(preprocessSeeditPatterns(`${pattern}.`)).toBe(`[${pattern}](/s/aww/comments/${CID}).`);
  });
});
