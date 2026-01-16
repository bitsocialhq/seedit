// download the ipfs binaries before building the electron clients

import fs from 'fs-extra';
import ProgressBar from 'progress';
import https from 'https';
import decompress from 'decompress';
import path from 'path';
import { fileURLToPath } from 'url';
const ipfsClientsPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'bin');
const ipfsClientWindowsPath = path.join(ipfsClientsPath, 'win');
const ipfsClientMacPath = path.join(ipfsClientsPath, 'mac');
const ipfsClientLinuxPath = path.join(ipfsClientsPath, 'linux');

// plebbit kubu download links https://github.com/plebbit/kubo/releases
// const ipfsClientVersion = '0.20.0'
// const ipfsClientWindowsUrl = `https://github.com/plebbit/kubo/releases/download/v${ipfsClientVersion}/ipfs-windows-amd64`
// const ipfsClientMacUrl = `https://github.com/plebbit/kubo/releases/download/v${ipfsClientVersion}/ipfs-darwin-amd64`
// const ipfsClientLinuxUrl = `https://github.com/plebbit/kubo/releases/download/v${ipfsClientVersion}/ipfs-linux-amd64`

// official kubo download links https://docs.ipfs.tech/install/command-line/#install-official-binary-distributions
const ipfsClientVersion = '0.32.1';

// Resolve desired build arch: allow overriding via env (so cross-arch builds pick correct binary)
const resolveBuildArch = () => {
  const envArch = process.env.SEEDIT_BUILD_ARCH;
  if (envArch === 'arm64' || envArch === 'x64') return envArch;
  // fallback to host arch
  if (process.arch === 'arm64') return 'arm64';
  return 'x64';
};

const toKuboArch = (arch) => (arch === 'arm64' ? 'arm64' : 'amd64');

const getKuboUrl = (platform) => {
  const arch = toKuboArch(resolveBuildArch());
  if (platform === 'win32') return `https://dist.ipfs.io/kubo/v${ipfsClientVersion}/kubo_v${ipfsClientVersion}_windows-${arch}.zip`;
  if (platform === 'darwin') return `https://dist.ipfs.io/kubo/v${ipfsClientVersion}/kubo_v${ipfsClientVersion}_darwin-${arch}.tar.gz`;
  if (platform === 'linux') return `https://dist.ipfs.io/kubo/v${ipfsClientVersion}/kubo_v${ipfsClientVersion}_linux-${arch}.tar.gz`;
  // default to linux
  return `https://dist.ipfs.io/kubo/v${ipfsClientVersion}/kubo_v${ipfsClientVersion}_linux-${arch}.tar.gz`;
};

const downloadWithProgress = (url) =>
  new Promise((resolve, reject) => {
    const split = url.split('/');
    const fileName = split[split.length - 1];
    const chunks = [];
    const req = https.request(url);
    req.on('error', (err) => {
      console.error(`Error making request for ${url}:`, err);
      reject(err);
    });
    req.on('response', (res) => {
      res.on('error', (err) => {
        console.error(`Error in response for ${url}:`, err);
        reject(err);
      });
      // handle redirects
      if (res.statusCode == 301 || res.statusCode === 302) {
        resolve(downloadWithProgress(res.headers.location));
        return;
      }

      const len = parseInt(res.headers['content-length'], 10);
      console.log();
      const bar = new ProgressBar(`  ${fileName} [:bar] :rate/bps :percent :etas`, {
        complete: '=',
        incomplete: ' ',
        width: 20,
        total: len,
        stream: process.stdout,
      });
      res.on('data', (chunk) => {
        chunks.push(chunk);
        bar.tick(chunk.length);
      });
      res.on('end', () => {
        console.log('\n');
        resolve(Buffer.concat(chunks));
      });
    });
    req.end();
  });

// add retry wrapper around downloadWithProgress to handle transient network errors
const downloadWithRetry = async (url, retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await downloadWithProgress(url);
    } catch (err) {
      console.warn(`Download attempt ${attempt} for ${url} failed:`, err);
      if (attempt === retries) throw err;
      // wait before retrying
      await new Promise((res) => setTimeout(res, attempt * 1000));
    }
  }
};

// official kubo downloads need to be extracted
const downloadAndExtract = async (url, destinationPath) => {
  let binName = 'ipfs';
  if (destinationPath.endsWith('win')) {
    binName += '.exe';
  }
  const binPath = path.join(destinationPath, binName);
  if (fs.pathExistsSync(binPath)) {
    return;
  }
  console.log(`Downloading IPFS client from ${url} to ${destinationPath}`);
  const split = url.split('/');
  const fileName = split[split.length - 1];
  const archivePath = path.join(destinationPath, fileName);
  const file = await downloadWithRetry(url);
  fs.ensureDirSync(destinationPath);
  await fs.writeFile(archivePath, file);
  console.log(`Downloaded archive to ${archivePath}`);
  console.log(`Extracting ${archivePath} to ${destinationPath}`);
  try {
    await decompress(archivePath, destinationPath);
    console.log('Decompression complete');
  } catch (err) {
    console.error('Error during decompression:', err);
    throw err;
  }
  const extractedPath = path.join(destinationPath, 'kubo');
  const extractedBinPath = path.join(extractedPath, binName);
  console.log(`Moving binary from ${extractedBinPath} to ${binPath}`);
  fs.moveSync(extractedBinPath, binPath);
  console.log('Binary moved');
  console.log('Cleaning up temporary files');
  fs.removeSync(archivePath);
  console.log('Cleanup complete');
};

export const downloadIpfsClients = async () => {
  const platform = process.platform;
  console.log(`Starting IPFS client download for platform: ${platform}, targetArch: ${resolveBuildArch()}`);
  const url = getKuboUrl(platform);
  if (platform === 'win32') {
    await downloadAndExtract(url, ipfsClientWindowsPath);
  } else if (platform === 'darwin') {
    await downloadAndExtract(url, ipfsClientMacPath);
  } else if (platform === 'linux') {
    await downloadAndExtract(url, ipfsClientLinuxPath);
  } else {
    console.warn(`Unknown platform: ${platform}, defaulting to linux path`);
    await downloadAndExtract(url, ipfsClientLinuxPath);
  }
};

export default async (_context) => {
  await downloadIpfsClients();
};
