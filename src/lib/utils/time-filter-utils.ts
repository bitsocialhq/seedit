export const getTopTimeFilterPath = (pathname: string, currentTimeFilterName: string | undefined, nextTimeFilterName: string, search = ''): string => {
  const currentSuffix = currentTimeFilterName ? `/${currentTimeFilterName}` : '';
  const basePath = currentSuffix && pathname.endsWith(currentSuffix) ? pathname.slice(0, -currentSuffix.length) : pathname;
  return `${basePath}/${nextTimeFilterName}${search}`;
};

export const getPathWithoutTimeFilter = (pathname: string, timeFilterName: string, search = ''): string => {
  const suffix = `/${timeFilterName}`;
  return `${pathname.endsWith(suffix) ? pathname.slice(0, -suffix.length) : pathname}${search}`;
};
