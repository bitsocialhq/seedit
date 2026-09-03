import { Navigate, useParams } from 'react-router-dom';
import { isDirectoryCode } from '../../lib/utils/directory-codes';
import About from './about';

const DirectoryAbout = () => {
  const { directoryCode } = useParams();

  return directoryCode && !isDirectoryCode(directoryCode) ? <Navigate to='/not-found' replace /> : <About />;
};

export default DirectoryAbout;
