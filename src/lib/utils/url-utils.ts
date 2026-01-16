import { copyToClipboard } from './clipboard-utils';

export const getHostname = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

export const isValidURL = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const copyShareLinkToClipboard = async (subplebbitAddress: string, cid: string) => {
  const shareLink = `https://pleb.bz/p/${subplebbitAddress}/c/${cid}`;
  await copyToClipboard(shareLink);
};

const SEEDIT_HOSTNAMES = ['seedit.app', 'seedit.eth.limo', 'seedit.eth.link', 'seedit.eth.sucks', 'seedit.netlify.app', 'pleb.bz'];

// Check if a URL is a valid seedit link that should be handled internally
export const isSeeditLink = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.replace(/^www\./, '');

    if (!SEEDIT_HOSTNAMES.includes(hostname)) {
      return false;
    }

    // Check both pathname and hash for the route pattern
    let routePath = parsedUrl.pathname;

    // If there's a hash that starts with #/, use that as the route path
    if (parsedUrl.hash && parsedUrl.hash.startsWith('#/')) {
      routePath = parsedUrl.hash.substring(1); // Remove the # to get the path
    }

    // For pleb.bz, only support the exact sharelink format without redirect parameter
    if (hostname === 'pleb.bz') {
      // Don't treat as internal if there's a redirect parameter
      if (parsedUrl.searchParams.has('redirect')) {
        return false;
      }
      // Must match exactly: /p/{subplebbitAddress}/c/{cid}
      return /^\/p\/[^/]+\/c\/[^/]+$/.test(routePath);
    }

    // For other seedit hostnames, support:
    // - /p/{subplebbitAddress}
    // - /p/{subplebbitAddress}/c/{commentCid}
    return /^\/p\/[^/]+(\/c\/[^/]+)?$/.test(routePath);
  } catch {
    return false;
  }
};

// Transform a valid seedit URL to an internal route
export const transformSeeditLinkToInternal = (url: string): string | null => {
  if (!isSeeditLink(url)) {
    return null;
  }

  try {
    const parsedUrl = new URL(url);

    // Check if this is a hash-based route
    if (parsedUrl.hash && parsedUrl.hash.startsWith('#/')) {
      // Extract the route from the hash, preserving any query params within the hash
      const hashPath = parsedUrl.hash.substring(1); // Remove the #
      return hashPath;
    }

    // For regular pathname-based routes
    return parsedUrl.pathname + parsedUrl.search + parsedUrl.hash;
  } catch {
    return null;
  }
};

// Check if a string is a valid IPNS public key (52 chars starting with 12D3KooW)
const isValidIPNSKey = (str: string): boolean => {
  return str.length === 52 && str.startsWith('12D3KooW');
};

// Check if a string is a valid domain (contains a dot)
const isValidDomain = (str: string): boolean => {
  return str.includes('.') && str.split('.').length >= 2 && str.split('.').every((part) => part.length > 0);
};

// Check if a plain text pattern is a valid seedit subplebbit reference
export const isValidSubplebbitPattern = (pattern: string): boolean => {
  // Must start with "p/"
  if (!pattern.startsWith('p/')) {
    return false;
  }

  const pathPart = pattern.substring(2); // Remove "p/"

  // Check if it's a post pattern: subplebbitAddress/c/cid
  const postMatch = pathPart.match(/^([^/]+)\/c\/([^/]+)$/);
  if (postMatch) {
    const [, subplebbitAddress, cid] = postMatch;
    // CID should be at least 10 characters (minimum reasonable CID length)
    return (isValidDomain(subplebbitAddress) || isValidIPNSKey(subplebbitAddress)) && cid.length >= 10;
  }

  // Check if it's just a subplebbit pattern: subplebbitAddress
  return isValidDomain(pathPart) || isValidIPNSKey(pathPart);
};

// Preprocess content to convert plain text seedit patterns to markdown links
export const preprocessSeeditPatterns = (content: string): string => {
  // Pattern to match "p/something" or "p/something/c/something"
  // Use negative lookbehind to avoid matching patterns that are already part of URLs
  // This prevents matching "p/" that comes after "://" or other URL indicators
  const pattern = /(?<!https?:\/\/[^\s]*)\bp\/([a-zA-Z0-9\-.]+(?:\/c\/[a-zA-Z0-9]{10,100})?)[.,:;!?]*/g;

  return content.replace(pattern, (match, capturedPath) => {
    // Remove any trailing punctuation from the captured path
    const cleanPath = capturedPath.replace(/[.,:;!?]+$/, '');
    const fullPattern = `p/${cleanPath}`;

    if (isValidSubplebbitPattern(fullPattern)) {
      // Get the trailing punctuation that was matched but shouldn't be part of the link
      const trailingPunctuation = match.slice(fullPattern.length);
      // Convert to markdown link format and preserve trailing punctuation
      return `[${fullPattern}](/${fullPattern})${trailingPunctuation}`;
    }

    // If not valid, return unchanged
    return match;
  });
};
