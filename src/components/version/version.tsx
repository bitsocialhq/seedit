import { Link } from 'react-router-dom';
import packageJson from '../../../package.json';

const { version } = packageJson;
const commitRef = import.meta.env.VITE_COMMIT_REF;

const VersionWithCommit = () => {
  return (
    <a
      href={commitRef ? `https://github.com/bitsocialnet/seedit/commit/${commitRef}` : `https://github.com/bitsocialnet/seedit/releases/tag/v${version}`}
      target='_blank'
      rel='noopener noreferrer'
    >
      v{commitRef ? `${version}#${commitRef.slice(0, 7)}` : version}
    </a>
  );
};

// clicking the running version opens the in-app changelog rather than leaving for GitHub
const Version = () => {
  return <Link to='/changelog'>v{version}</Link>;
};

export { Version, VersionWithCommit };
