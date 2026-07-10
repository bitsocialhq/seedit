// Peer geolocation helpers for the P2P stats panel.
//
// The world map first tries a public GeoIP lookup for the peer endpoint IP so the
// marker can land near the reported city/region. If that lookup fails, the map
// falls back to the offline RIR/country-centroid estimate below.

import { COUNTRY_CENTROIDS } from '../data/country-centroids';

const formatAddressString = (address: unknown): string => {
  if (typeof address === 'string') return address;
  if (address && typeof address === 'object' && typeof (address as { toString?: unknown }).toString === 'function') {
    try {
      return String(address);
    } catch {
      return '';
    }
  }
  return '';
};

export type PublicEndpoint = {
  countryCode?: string;
  ip: string;
  location?: PeerMapLocation;
};

export type LatLon = { lat: number; lon: number };

export type PeerMapLocation = LatLon & {
  countryCode?: string;
  label?: string;
  source: 'coarse' | 'geoip';
};

const COUNTRY_LOOKUP_URL = 'https://api.country.is';
const PUBLIC_IPV4_LOOKUP_URL = 'https://api.ipify.org?format=json';
const PEER_LOCATION_LOOKUP_URL = 'https://free.freeipapi.com/api/json';
const PEER_LOCATION_CACHE_MS = 24 * 60 * 60_000;
const PEER_LOCATION_FAILURE_CACHE_MS = 10 * 60_000;

export const extractIpFromAddress = (address: string): string | null => extractIpv4FromAddress(address) ?? extractIpv6FromAddress(address);

export const getFirstPublicIpFromAddresses = (addresses: unknown[]): string | undefined => {
  for (const address of addresses) {
    const ip = extractIpFromAddress(formatAddressString(address));
    if (ip && isPublicIpAddress(ip)) return ip;
  }
  return undefined;
};

let cachedOwnPublicEndpoint: { expiresAt: number; value?: PublicEndpoint } | undefined;
const peerLocationCache = new Map<string, { expiresAt: number; value?: PeerMapLocation }>();

const normalizeLookupCountryCode = (value: unknown) => {
  if (typeof value !== 'string') return undefined;
  const code = value.trim().toLowerCase();
  return /^[a-z]{2}$/.test(code) ? code : undefined;
};

const getCountryCentroidLocation = (countryCode: string | undefined): PeerMapLocation | undefined => {
  const normalizedCountryCode = normalizeLookupCountryCode(countryCode);
  const centroid = normalizedCountryCode ? COUNTRY_CENTROIDS[normalizedCountryCode] : undefined;
  if (!normalizedCountryCode || !centroid) return undefined;
  return {
    ...centroid,
    countryCode: normalizedCountryCode,
    label: normalizedCountryCode.toUpperCase(),
    source: 'coarse',
  };
};

export const getCountryConsistentLocation = (countryCode: string | undefined, location: PeerMapLocation | undefined): PeerMapLocation | undefined => {
  const normalizedCountryCode = normalizeLookupCountryCode(countryCode);
  if (!normalizedCountryCode) return location;
  if (!location) return getCountryCentroidLocation(normalizedCountryCode);
  const locationCountryCode = normalizeLookupCountryCode(location.countryCode);
  if (!locationCountryCode || locationCountryCode === normalizedCountryCode) {
    return {
      ...location,
      countryCode: locationCountryCode ?? normalizedCountryCode,
    };
  }
  return getCountryCentroidLocation(normalizedCountryCode);
};

const normalizePlaceName = (value: unknown) => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const getFiniteCoordinate = (value: unknown, min: number, max: number) => {
  const coordinate = Number(value);
  return Number.isFinite(coordinate) && coordinate >= min && coordinate <= max ? coordinate : undefined;
};

const parsePublicEndpoint = (data: unknown): PublicEndpoint | undefined => {
  if (!data || typeof data !== 'object') return undefined;
  const ip = (data as { ip?: unknown }).ip;
  if (typeof ip !== 'string' || !isPublicIpAddress(ip)) return undefined;
  return {
    countryCode: normalizeLookupCountryCode((data as { country?: unknown }).country),
    ip,
  };
};

const fetchPublicEndpoint = async (url: string, signal?: AbortSignal): Promise<PublicEndpoint | undefined> => {
  try {
    const response = await fetch(url, { signal });
    if (!response.ok) return undefined;
    return parsePublicEndpoint(await response.json());
  } catch {
    return undefined;
  }
};

const getIpLookupAddress = (ip: string) => `/ip${ip.includes(':') ? '6' : '4'}/${ip}/tcp/0`;

const parsePeerLocation = (data: unknown): PeerMapLocation | undefined => {
  if (!data || typeof data !== 'object') return undefined;
  const lat = getFiniteCoordinate((data as { latitude?: unknown }).latitude, -85, 85);
  const lon = getFiniteCoordinate((data as { longitude?: unknown }).longitude, -180, 180);
  if (lat === undefined || lon === undefined) return undefined;

  const countryCode = normalizeLookupCountryCode((data as { countryCode?: unknown }).countryCode);
  const city = normalizePlaceName((data as { cityName?: unknown }).cityName);
  const region = normalizePlaceName((data as { regionName?: unknown }).regionName);
  const label = [city, region, countryCode?.toUpperCase()].filter(Boolean).join(', ') || undefined;
  return {
    countryCode,
    label,
    lat,
    lon,
    source: 'geoip',
  };
};

const resolveOwnPublicEndpointLocation = async (endpoint: PublicEndpoint, signal?: AbortSignal): Promise<PublicEndpoint> => {
  const [countryCode, location] = await Promise.all([
    endpoint.countryCode ? Promise.resolve(endpoint.countryCode) : fetchOwnIpCountryCode(endpoint.ip, signal),
    fetchIpMapLocation(endpoint.ip, signal),
  ]);
  // An aborted lookup is cancellation, not a real failure: skip the coarse
  // region guess so a wrong flag is never derived from an interrupted request.
  const resolvedCountryCode =
    endpoint.countryCode ?? countryCode ?? location?.countryCode ?? (signal?.aborted ? undefined : getApproximateCountryCode(getIpLookupAddress(endpoint.ip)));
  return {
    ...endpoint,
    countryCode: resolvedCountryCode,
    location: getCountryConsistentLocation(resolvedCountryCode, location),
  };
};

// Fetches the browser node's own public endpoint for the P2P stats panel when
// libp2p only advertises local/private listen addresses (common in browser nodes
// and VPN setups). This only asks about the current browser's public endpoint;
// connected peer geolocation uses fetchPeerMapLocation below.
export const fetchOwnPublicEndpoint = async (signal?: AbortSignal): Promise<PublicEndpoint | undefined> => {
  if (cachedOwnPublicEndpoint && Date.now() < cachedOwnPublicEndpoint.expiresAt) return cachedOwnPublicEndpoint.value;

  const ipv4Endpoint = await fetchPublicEndpoint(PUBLIC_IPV4_LOOKUP_URL, signal);
  if (ipv4Endpoint) {
    const value = await resolveOwnPublicEndpointLocation(ipv4Endpoint, signal);
    // Don't cache a result computed from an aborted run (e.g. an effect re-run
    // cancelled the country lookups mid-flight): the country code would be
    // missing or a coarse guess, and caching it would show a wrong flag for the
    // next 60s of refreshes even though the real lookups succeed.
    if (!signal?.aborted) cachedOwnPublicEndpoint = { expiresAt: Date.now() + 60_000, value };
    return value;
  }

  const endpoint = await fetchPublicEndpoint(COUNTRY_LOOKUP_URL, signal);
  if (endpoint) {
    const value = await resolveOwnPublicEndpointLocation(endpoint, signal);
    if (!signal?.aborted) cachedOwnPublicEndpoint = { expiresAt: Date.now() + 60_000, value };
    return value;
  }
  // Don't cache an empty result produced by an aborted lookup (e.g. the panel was
  // closed mid-request): that is cancellation, not a real failure, so a later
  // reopen should retry instead of being served a cached blank for 30s.
  if (!signal?.aborted) cachedOwnPublicEndpoint = { expiresAt: Date.now() + 30_000, value: undefined };
  return undefined;
};

const ownIpCountryCache = new Map<string, { expiresAt: number; value?: string }>();

// Accurate country code for the local node's OWN public IP, so the P2P stats
// "Your IP" flag matches the address shown instead of the coarse continent guess.
// Like fetchOwnPublicEndpoint, this only asks about the user's own node address.
export const fetchOwnIpCountryCode = async (ip: string, signal?: AbortSignal): Promise<string | undefined> => {
  const cached = ownIpCountryCache.get(ip);
  if (cached && Date.now() < cached.expiresAt) return cached.value;
  const endpoint = await fetchPublicEndpoint(`${COUNTRY_LOOKUP_URL}/${ip}`, signal);
  const value = endpoint?.countryCode;
  // See fetchOwnPublicEndpoint: skip caching when the lookup was aborted so a
  // cancelled request does not blank the flag for 60s on the next open.
  if (!signal?.aborted) ownIpCountryCache.set(ip, { expiresAt: Date.now() + 60_000, value });
  return value;
};

type Region = 'AF' | 'AS' | 'EU' | 'NA' | 'SA';

const REGION_CENTROIDS: Record<Region, LatLon> = {
  AF: { lat: 4, lon: 21 },
  AS: { lat: 30, lon: 105 },
  EU: { lat: 50, lon: 15 },
  NA: { lat: 39, lon: -97 },
  SA: { lat: -15, lon: -58 },
};

// Approximate first-octet (/8) -> RIR region, applied in order (later wins).
// Coarse and not authoritative; uncovered octets fall back to NA (ARIN-heavy
// legacy space). Good enough for a continent-level dot on a map.
const REGION_RANGES: [number, number, Region][] = [
  // APNIC (Asia / Pacific)
  [1, 1, 'AS'],
  [14, 14, 'AS'],
  [27, 27, 'AS'],
  [36, 36, 'AS'],
  [39, 39, 'AS'],
  [42, 43, 'AS'],
  [49, 49, 'AS'],
  [58, 61, 'AS'],
  [101, 103, 'AS'],
  [106, 106, 'AS'],
  [110, 126, 'AS'],
  [133, 133, 'AS'],
  [150, 153, 'AS'],
  [163, 163, 'AS'],
  [171, 171, 'AS'],
  [175, 175, 'AS'],
  [180, 183, 'AS'],
  [202, 203, 'AS'],
  [210, 211, 'AS'],
  [218, 223, 'AS'],
  // RIPE NCC (Europe / Middle East)
  [2, 2, 'EU'],
  [5, 5, 'EU'],
  [25, 25, 'EU'],
  [31, 31, 'EU'],
  [37, 37, 'EU'],
  [46, 46, 'EU'],
  [51, 51, 'EU'],
  [53, 53, 'EU'],
  [57, 57, 'EU'],
  [62, 62, 'EU'],
  [77, 95, 'EU'],
  [109, 109, 'EU'],
  [141, 141, 'EU'],
  [145, 145, 'EU'],
  [151, 151, 'EU'],
  [176, 176, 'EU'],
  [178, 178, 'EU'],
  [185, 185, 'EU'],
  [188, 188, 'EU'],
  [193, 195, 'EU'],
  [212, 213, 'EU'],
  [217, 217, 'EU'],
  // AFRINIC (Africa)
  [41, 41, 'AF'],
  [102, 102, 'AF'],
  [105, 105, 'AF'],
  [154, 156, 'AF'],
  [196, 197, 'AF'],
  // LACNIC (Latin America / Caribbean)
  [177, 177, 'SA'],
  [179, 179, 'SA'],
  [181, 181, 'SA'],
  [186, 187, 'SA'],
  [189, 191, 'SA'],
  [200, 201, 'SA'],
];

const REGION_BY_OCTET: Region[] = (() => {
  const table: Region[] = Array.from({ length: 256 }, () => 'NA' as Region);
  for (const [start, end, region] of REGION_RANGES) {
    for (let octet = start; octet <= end; octet++) table[octet] = region;
  }
  return table;
})();

export const extractIpv4FromAddress = (address: string): string | null => {
  const direct = /\/ip4\/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/.exec(address);
  if (direct) return direct[1];
  // Some peers are reached via a DNS name that embeds the IPv4 with dashes, e.g.
  // /dns4/91-234-56-78.host.example -> 91.234.56.78
  const dashed = /\/dns[46]?\/[^/]*?(?<!\d)(\d{1,3})-(\d{1,3})-(\d{1,3})-(\d{1,3})(?![\d-])/.exec(address);
  if (dashed) return `${dashed[1]}.${dashed[2]}.${dashed[3]}.${dashed[4]}`;
  return null;
};

export const extractIpv6FromAddress = (address: string): string | null => {
  const direct = /\/ip6\/([^/]+)/.exec(address);
  if (direct) return direct[1];
  const dns = /\/dns6\/([^/]+)/i.exec(address);
  const firstLabel = dns?.[1]?.split('.')[0];
  if (!firstLabel || !firstLabel.includes('-') || !/^[0-9a-f-]+$/i.test(firstLabel)) return null;
  const candidate = firstLabel.replaceAll('-', ':').toLowerCase();
  try {
    new URL(`http://[${candidate}]/`);
    return candidate;
  } catch {
    return null;
  }
};

const parseOctets = (ip: string): number[] | null => {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return parts;
};

export const isPrivateOrReservedIpv4 = (ip: string): boolean => {
  const parts = parseOctets(ip);
  if (!parts) return true;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true; // this-network, private, loopback
  if (a === 169 && b === 254) return true; // link-local
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast / reserved
  return false;
};

const isProbablyPublicIpv6 = (ip: string): boolean => {
  const normalized = ip.trim().toLowerCase();
  if (!normalized.includes(':')) return false;
  if (normalized === '::' || normalized === '::1') return false;
  if (normalized.startsWith('fe80:') || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('ff')) return false;
  if (normalized.startsWith('2001:db8:')) return false;
  return /^[0-9a-f:.]+$/.test(normalized);
};

const isPublicIpAddress = (ip: string): boolean => (ip.includes(':') ? isProbablyPublicIpv6(ip) : !isPrivateOrReservedIpv4(ip));

const getPublicIpFromAddress = (address: string): string | undefined => {
  const ip = extractIpFromAddress(address);
  return ip && isPublicIpAddress(ip) ? ip : undefined;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const hashOctets = (parts: number[]) => {
  let hash = 0;
  for (const part of parts) hash = (Math.imul(hash, 131) + part) | 0;
  return Math.abs(hash);
};

// Maps a peer's multiaddr to an approximate lat/lon, or null when it cannot be
// placed offline (private/reserved IPv4, IPv6, or a DNS address).
export const getApproximateLatLon = (address: string): LatLon | null => {
  const ip = extractIpv4FromAddress(address);
  if (!ip || isPrivateOrReservedIpv4(ip)) return null;
  const parts = parseOctets(ip);
  if (!parts) return null;

  const hash = hashOctets(parts);
  // Snap the marker to the centroid of the same country shown as the peer's flag
  // (getApproximateCountryCode), falling back to the continent centroid if that
  // country has no known centroid. A small deterministic jitter keeps multiple
  // peers in one country from stacking exactly while staying near its center.
  const country = getApproximateCountryCode(address);
  const centroid = (country && COUNTRY_CENTROIDS[country]) || REGION_CENTROIDS[REGION_BY_OCTET[parts[0]]];
  const lonOffset = ((hash % 1000) / 1000 - 0.5) * 2.4; // +/- 1.2 deg
  const latOffset = ((Math.floor(hash / 1000) % 1000) / 1000 - 0.5) * 1.6; // +/- 0.8 deg
  return { lat: clamp(centroid.lat + latOffset, -85, 85), lon: clamp(centroid.lon + lonOffset, -180, 180) };
};

const getCoarsePeerMapLocation = (address: string): PeerMapLocation | undefined => {
  const location = getApproximateLatLon(address);
  if (!location) return undefined;
  const countryCode = getApproximateCountryCode(address);
  return {
    ...location,
    countryCode,
    label: countryCode ? countryCode.toUpperCase() : undefined,
    source: 'coarse',
  };
};

// Representative countries per region. The RIR table only resolves to a continent,
// so the flag is a deterministic, approximate pick from the region's common
// countries — consistent with the map's "approximate locations" framing, not real
// per-peer country geolocation.
const REGION_COUNTRIES: Record<Region, string[]> = {
  AF: ['za', 'ng', 'eg', 'ke', 'ma', 'dz', 'tn'],
  AS: ['jp', 'cn', 'sg', 'in', 'kr', 'hk', 'id', 'vn', 'th', 'tw'],
  EU: ['de', 'nl', 'fr', 'gb', 'ru', 'se', 'fi', 'pl', 'it', 'es', 'ua', 'ro'],
  NA: ['us', 'us', 'ca', 'us', 'mx'],
  SA: ['br', 'ar', 'cl', 'co', 'pe'],
};

// Approximate 2-letter country code for a peer, or undefined when it cannot be
// placed offline. See REGION_COUNTRIES: this is region-level, not precise.
export const getApproximateCountryCode = (address: string): string | undefined => {
  const ip = extractIpv4FromAddress(address);
  if (!ip || isPrivateOrReservedIpv4(ip)) return undefined;
  const parts = parseOctets(ip);
  if (!parts) return undefined;
  const pool = REGION_COUNTRIES[REGION_BY_OCTET[parts[0]]];
  return pool[hashOctets(parts) % pool.length];
};

export const fetchIpMapLocation = async (ip: string, signal?: AbortSignal): Promise<PeerMapLocation | undefined> => {
  const cached = peerLocationCache.get(ip);
  if (cached && Date.now() < cached.expiresAt) return cached.value;

  let value: PeerMapLocation | undefined;
  try {
    const response = await fetch(`${PEER_LOCATION_LOOKUP_URL}/${encodeURIComponent(ip)}`, { signal });
    if (response.ok) value = parsePeerLocation(await response.json());
  } catch {
    value = undefined;
  }

  // See fetchOwnPublicEndpoint: a cancelled request should not poison the cache.
  if (!signal?.aborted) {
    peerLocationCache.set(ip, {
      expiresAt: Date.now() + (value ? PEER_LOCATION_CACHE_MS : PEER_LOCATION_FAILURE_CACHE_MS),
      value,
    });
  }
  return value;
};

export const fetchPeerMapLocation = async (address: string, signal?: AbortSignal): Promise<PeerMapLocation | undefined> => {
  const ip = getPublicIpFromAddress(address);
  if (!ip) return undefined;
  return (await fetchIpMapLocation(ip, signal)) ?? getCoarsePeerMapLocation(address);
};
