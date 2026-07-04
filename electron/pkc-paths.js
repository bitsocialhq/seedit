import fs from 'fs';
import path from 'path';
import EnvPaths from 'env-paths';

const PKC_APP_NAME = 'pkc';
const PKC_DEV_DATA_DIR = '.pkc';
const LEGACY_APP_NAME = 'plebbit';
const LEGACY_DEV_DATA_DIR = '.plebbit';

// one-time migration: older seedit versions stored data in the 'plebbit' dir
// (env-paths in production, project-root '.plebbit' in dev), rename it to the
// shared 'pkc' dir so existing users keep their communities and accounts
const migrateLegacyPlebbitDataPath = (pkcDataPath, legacyDataPath) => {
  try {
    if (!fs.existsSync(pkcDataPath) && fs.existsSync(legacyDataPath)) {
      fs.renameSync(legacyDataPath, pkcDataPath);
      console.log(`migrated legacy data dir '${legacyDataPath}' to '${pkcDataPath}'`);
    }
  } catch (e) {
    console.log('failed migrating legacy plebbit data dir', e);
  }
};

export const getDevPkcDataPath = (projectRoot) => {
  const pkcDataPath = path.join(projectRoot, PKC_DEV_DATA_DIR);
  migrateLegacyPlebbitDataPath(pkcDataPath, path.join(projectRoot, LEGACY_DEV_DATA_DIR));
  return pkcDataPath;
};

const getProductionPkcDataPath = () => {
  const pkcDataPath = EnvPaths(PKC_APP_NAME, { suffix: false }).data;
  migrateLegacyPlebbitDataPath(pkcDataPath, EnvPaths(LEGACY_APP_NAME, { suffix: false }).data);
  return pkcDataPath;
};

export const getPkcLogPath = () => EnvPaths(PKC_APP_NAME, { suffix: false }).log;

export const getPkcDataPath = ({ isDev, projectRoot }) => (isDev ? getDevPkcDataPath(projectRoot) : getProductionPkcDataPath());
