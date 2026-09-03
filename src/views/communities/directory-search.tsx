import styles from './directory-vote.module.css';

interface DirectorySearchProps {
  label: string;
  query: string;
  onQueryChange: (query: string) => void;
}

const DirectorySearch = ({ label, query, onQueryChange }: DirectorySearchProps) => (
  <form className={styles.directorySearch} role='search' onSubmit={(event) => event.preventDefault()}>
    <h4>{label}</h4>
    <div className={styles.directorySearchField}>
      <input
        className={styles.directorySearchInput}
        type='search'
        value={query}
        aria-label={label}
        placeholder={label}
        onChange={(event) => onQueryChange(event.target.value)}
      />
      <button className={styles.directorySearchButton} type='submit' aria-label={label} />
    </div>
  </form>
);

export default DirectorySearch;
