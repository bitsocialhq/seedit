export const sortTypes = ['hot', 'new', 'active', 'top'];

const legacyTopSortType = 'topAll';

export const normalizeRouteSortType = (sortType?: string): string | undefined => (sortType === legacyTopSortType ? 'top' : sortType);

export const isValidRouteSortType = (sortType?: string): boolean => {
  const normalizedSortType = normalizeRouteSortType(sortType);
  return !normalizedSortType || sortTypes.includes(normalizedSortType);
};

export const getRouteSortType = (sortType?: string): string => {
  const normalizedSortType = normalizeRouteSortType(sortType);
  return normalizedSortType && sortTypes.includes(normalizedSortType) ? normalizedSortType : sortTypes[0];
};

export const getFeedSortType = (sortType: string): string => (sortType === 'top' ? legacyTopSortType : sortType);

export const isLegacyTopRoute = (sortType?: string): boolean => sortType === legacyTopSortType;

export const getCanonicalTopPath = (pathname: string, search = ''): string => {
  const legacySegment = `/${legacyTopSortType}`;
  const segmentIndex = pathname.lastIndexOf(legacySegment);
  if (segmentIndex === -1) return `${pathname}${search}`;
  return `${pathname.slice(0, segmentIndex)}/top${pathname.slice(segmentIndex + legacySegment.length)}${search}`;
};
