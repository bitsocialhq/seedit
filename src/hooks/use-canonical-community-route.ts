import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getCanonicalCommunityRoutePathname } from '../lib/utils/community-route-utils';

const useCanonicalCommunityRoute = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const canonicalPathname = getCanonicalCommunityRoutePathname(location.pathname);

  useEffect(() => {
    if (!canonicalPathname) return;

    navigate(
      {
        pathname: canonicalPathname,
        search: location.search,
        hash: location.hash,
      },
      { replace: true },
    );
  }, [canonicalPathname, location.hash, location.search, navigate]);
};

export default useCanonicalCommunityRoute;
