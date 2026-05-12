import { execFileSync } from 'node:child_process';
import { createHash, createSign } from 'node:crypto';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const DEFAULT_BUILD_DIR = path.join(REPO_ROOT, 'build');
const DEFAULT_OUT_DIR = path.join(REPO_ROOT, 'dist');
const MANIFEST_SCHEMA = 'bitsocial.release-manifest.v1';
const SIGNATURE_SCHEMA = 'bitsocial.release-manifest-signature.v1';
const SIGNATURE_ALGORITHM = 'ECDSA-P256-SHA256';
const DEFAULT_KEY_ID = 'seedit-release-p256-2026-05';
const MANIFEST_FILE = 'seedit-release-manifest.json';
const SIGNATURE_FILE = 'seedit-release-manifest.sig.json';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index];
  const value = process.argv[index + 1];
  if (!key?.startsWith('--') || !value) {
    throw new Error(`Invalid argument near ${key ?? '<empty>'}`);
  }
  args.set(key, value);
}

const buildDir = path.resolve(args.get('--build-dir') ?? DEFAULT_BUILD_DIR);
const outDir = path.resolve(args.get('--out-dir') ?? DEFAULT_OUT_DIR);
const packageJson = JSON.parse(await readFile(path.join(REPO_ROOT, 'package.json'), 'utf8'));
const version = packageJson.version;
const releaseTag = process.env.GITHUB_REF_NAME?.startsWith('v') ? process.env.GITHUB_REF_NAME : `v${version}`;
const privateKeyPem = process.env.RELEASE_MANIFEST_PRIVATE_KEY_PEM;
const keyId = process.env.RELEASE_MANIFEST_KEY_ID || DEFAULT_KEY_ID;

if (!privateKeyPem) {
  throw new Error('RELEASE_MANIFEST_PRIVATE_KEY_PEM is required to sign the release manifest');
}

const files = await listFiles(buildDir);
const manifest = {
  schema: MANIFEST_SCHEMA,
  appName: 'Seedit',
  version,
  releaseTag,
  verificationScope: 'web-release-all-files',
  generatedAt: new Date().toISOString(),
  sourceCommit: process.env.GITHUB_SHA || readGitCommit(),
  files,
};
const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
const manifestSha256 = sha256Hex(manifestBytes);
const signer = createSign('sha256');
signer.update(manifestBytes);
signer.end();
const signature = signer.sign({ key: privateKeyPem, dsaEncoding: 'ieee-p1363' });
const signaturePayload = {
  schema: SIGNATURE_SCHEMA,
  algorithm: SIGNATURE_ALGORITHM,
  keyId,
  manifestSha256,
  signature: base64Url(signature),
};

await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, MANIFEST_FILE), manifestBytes);
await writeFile(path.join(outDir, SIGNATURE_FILE), `${JSON.stringify(signaturePayload, null, 2)}\n`);

console.log(`Wrote ${path.relative(REPO_ROOT, path.join(outDir, MANIFEST_FILE))}`);
console.log(`Wrote ${path.relative(REPO_ROOT, path.join(outDir, SIGNATURE_FILE))}`);

async function listFiles(rootDir) {
  const entries = [];

  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const relativePath = normalizePath(path.relative(rootDir, absolutePath));
      if (relativePath === MANIFEST_FILE || relativePath === SIGNATURE_FILE) {
        continue;
      }

      const bytes = await readFile(absolutePath);
      const fileStat = await stat(absolutePath);
      entries.push({
        path: relativePath,
        bytes: fileStat.size,
        sha256: sha256Hex(bytes),
      });
    }
  }

  await walk(rootDir);
  return entries.sort((first, second) => first.path.localeCompare(second.path));
}

function normalizePath(value) {
  return value.split(path.sep).join('/');
}

function readGitCommit() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return undefined;
  }
}

function sha256Hex(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function base64Url(bytes) {
  return Buffer.from(bytes).toString('base64url');
}
