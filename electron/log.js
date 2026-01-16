// require this file to log to file in case there's a crash

import util from 'util';
import fs from 'fs-extra';
import path from 'path';
import EnvPaths from 'env-paths';
import isDev from 'electron-is-dev';
const envPaths = EnvPaths('plebbit', { suffix: false });

// previous version created a file instead of folder
// we should remove this at some point
try {
  if (fs.lstatSync(envPaths.log).isFile()) {
    fs.removeSync(envPaths.log);
  }
} catch {}

const logFilePath = path.join(envPaths.log, new Date().toISOString().substring(0, 7));
fs.ensureFileSync(logFilePath);
const logFile = fs.createWriteStream(logFilePath, { flags: 'a' });
const writeLog = (...args) => {
  logFile.write(new Date().toISOString() + ' ');
  for (const arg of args) {
    logFile.write(util.format(arg) + ' ');
  }
  logFile.write('\r\n');
};

const consoleLog = console.log;
const consoleError = console.error;
const consoleWarn = console.warn;
const consoleDebug = console.debug;

// In production, avoid writing verbose logs (log/debug) to disk to prevent I/O thrash.
if (!isDev) {
  console.log = (...args) => {
    // keep stdout behavior but don't write to file
    consoleLog(...args);
  };
  console.debug = (...args) => {
    consoleDebug(...args);
  };
  console.warn = (...args) => {
    writeLog(...args);
    consoleWarn(...args);
  };
  console.error = (...args) => {
    writeLog(...args);
    consoleError(...args);
  };
} else {
  // In dev, mirror everything to file for easier debugging
  console.log = (...args) => {
    writeLog(...args);
    consoleLog(...args);
  };
  console.warn = (...args) => {
    writeLog(...args);
    consoleWarn(...args);
  };
  console.error = (...args) => {
    writeLog(...args);
    consoleError(...args);
  };
  console.debug = (...args) => {
    for (const arg of args) {
      logFile.write(util.format(arg) + ' ');
    }
    logFile.write('\r\n');
    consoleDebug(...args);
  };
}

// errors aren't console logged
process.on('uncaughtException', console.error);
process.on('unhandledRejection', console.error);

if (isDev) console.log(envPaths);
