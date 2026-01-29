import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json to get app metadata
const packageJson = JSON.parse(fs.readFileSync(join(__dirname, 'package.json'), 'utf-8'));
const debugRunId = process.env.SEEDIT_DEBUG_RUN_ID || 'pre-fix';

// #region agent log
fetch('http://127.0.0.1:7245/ingest/bef9e25e-dc2f-416e-b6b5-46eba191f1ec', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: 'debug-session',
    runId: debugRunId,
    hypothesisId: 'D',
    location: 'forge.config.js:12',
    message: 'forge config loaded',
    data: { cwd: process.cwd(), envOutDir: process.env.ELECTRON_FORGE_OUT_DIR || null, appName: packageJson.build?.productName || packageJson.name },
    timestamp: Date.now(),
  }),
}).catch(() => {});
// #endregion

const config = {
  packagerConfig: {
    name: packageJson.build?.productName || packageJson.name,
    executableName: packageJson.build?.mac?.executableName || packageJson.build?.win?.executableName || packageJson.build?.linux?.executableName || packageJson.name,
    appBundleId: 'seedit.desktop',
    // Unpack native modules and kubo binary from ASAR so they can be executed
    asar: {
      unpack: '{*.node,*.dll,*.dylib,*.so,**/kubo/bin/**,**/kubo/kubo/**}',
    },
    ignore: [
      // Source files (not needed in production)
      /^\/src/,
      /^\/public/,
      /^\/android/,
      /^\/\.github/,
      /^\/scripts/,
      // Electron build/config files (not needed at runtime)
      /^\/electron\/.*\.(ts|mjs)$/,
      /^\/electron\/vite.*\.js$/,
      /^\/electron\/download-ipfs\.js$/,
      /^\/electron\/before-pack\.js$/,
      /^\/electron\/after-all-artifact-build\.cjs$/,
      /^\/electron\/build-docker\.sh$/,
      /^\/electron\/src\//,
      // Config/meta files
      /^\/\.git/,
      /^\/\.gitignore/,
      /^\/\.oxfmtrc\.json/,
      /^\/oxlintrc\.json/,
      /^\/tsconfig\.json/,
      /^\/vite\.config\.js/,
      /^\/forge\.config\.js/,
      /^\/capacitor\.config\.ts/,
      /^\/README\.md/,
      /^\/CHANGELOG\.md/,
      /^\/LICENSE/,
      /^\/AGENTS\.md/,
      /^\/\.env/,
      /^\/\.plebbit/,
      /^\/bin/,
      // Node modules optimization
      /^\/node_modules\/\.cache/,
      /^\/node_modules\/\.bin/,
      /^\/\.yarn/,
      /^\/yarn\.lock/,
      /^\/\.DS_Store/,
      /^\/out/,
      /^\/squashfs-root/,
      /^\/dist/, // Old build output (now using build/)
    ],
    extraResource: [],
  },

  rebuildConfig: {
    force: true,
  },

  makers: [
    {
      name: '@electron-forge/maker-dmg',
      config: {
        name: packageJson.build?.productName || packageJson.name,
        format: 'UDZO',
        background: undefined,
        icon: undefined,
        iconSize: 128,
        contents: [
          { x: 410, y: 150, type: 'link', path: '/Applications' },
          { x: 130, y: 150, type: 'file' },
        ],
      },
    },
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: packageJson.build?.productName || packageJson.name,
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@reforged/maker-appimage',
      config: {
        options: {
          categories: ['Network'],
        },
      },
    },
  ],
  hooks: {
    postPackage: async (_config, options) => {
      const outputPaths = options?.outputPaths || [];
      const outputPathsDir = join(__dirname, '.cursor');
      const outputPathsFile = join(outputPathsDir, 'forge-output-paths.json');
      let outputPathsWriteError = null;

      try {
        fs.mkdirSync(outputPathsDir, { recursive: true });
        fs.writeFileSync(outputPathsFile, JSON.stringify({ outputPaths }, null, 2));
      } catch (error) {
        outputPathsWriteError = error.message;
      }

      const outputSummary = outputPaths.map((outputPath) => {
        if (!fs.existsSync(outputPath)) return { outputPath, exists: false };
        let entries = [];
        try {
          entries = fs.readdirSync(outputPath).slice(0, 10);
        } catch (error) {
          return { outputPath, exists: true, error: error.message };
        }
        return { outputPath, exists: true, entryCount: entries.length, entries };
      });

      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/bef9e25e-dc2f-416e-b6b5-46eba191f1ec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: debugRunId,
          hypothesisId: 'D',
          location: 'forge.config.js:88',
          message: 'postPackage output paths',
          data: {
            cwd: process.cwd(),
            envOutDir: process.env.ELECTRON_FORGE_OUT_DIR || null,
            outputPaths,
            outputSummary,
            outputPathsFile,
            outputPathsWriteError,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
    },
  },
  plugins: [],
};

export default config;
