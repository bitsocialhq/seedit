import path from 'path';
import EnvPaths from 'env-paths';

const PKC_APP_NAME = 'pkc';
const PKC_DEV_DATA_DIR = '.pkc';

export const getDevPkcDataPath = (projectRoot) => path.join(projectRoot, PKC_DEV_DATA_DIR);

const getProductionPkcDataPath = () => EnvPaths(PKC_APP_NAME, { suffix: false }).data;

export const getPkcLogPath = () => EnvPaths(PKC_APP_NAME, { suffix: false }).log;

export const getPkcDataPath = ({ isDev, projectRoot }) => (isDev ? getDevPkcDataPath(projectRoot) : getProductionPkcDataPath());
