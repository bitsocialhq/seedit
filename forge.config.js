import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json to get app metadata
const packageJson = JSON.parse(fs.readFileSync(join(__dirname, 'package.json'), 'utf-8'));

const config = {
  packagerConfig: {
    name: packageJson.build?.productName || packageJson.name,
    executableName: packageJson.build?.mac?.executableName || packageJson.build?.win?.executableName || packageJson.build?.linux?.executableName || packageJson.name,
    appBundleId: 'seedit.desktop',

    // Unpack native modules and kubo binary from ASAR so they can be executed
    asar: {
      unpack: '{*.node,*.dll,*.dylib,*.so,**/kubo/bin/**,**/kubo/kubo/**}',
    },

    // Exclude unnecessary files from the package
    ignore: [
      /^\/src/,
      /^\/public/,
      /^\/android/,
      /^\/\.github/,
      /^\/scripts/,
      /^\/electron\/.*\.(ts|mjs)$/,
      /^\/electron\/vite.*\.js$/,
      /^\/electron\/download-ipfs\.js$/,
      /^\/electron\/before-pack\.js$/,
      /^\/electron\/after-all-artifact-build\.cjs$/,
      /^\/electron\/build-docker\.sh$/,
      /^\/electron\/src\//,
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
      /^\/node_modules\/\.cache/,
      /^\/node_modules\/\.bin/,
      /^\/\.yarn/,
      /^\/yarn\.lock/,
      /^\/\.DS_Store/,
      /^\/out/,
      /^\/squashfs-root/,
      /^\/dist/,
    ],
  },

  rebuildConfig: {
    force: true,
  },

  makers: [
    // macOS
    {
      name: '@electron-forge/maker-dmg',
      platforms: ['darwin'],
      config: {
        name: packageJson.build?.productName || packageJson.name,
        format: 'UDZO',
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    // Windows
    {
      name: '@electron-forge/maker-squirrel',
      platforms: ['win32'],
      config: {
        name: packageJson.build?.productName || packageJson.name,
      },
    },
    // Linux
    {
      name: '@reforged/maker-appimage',
      platforms: ['linux'],
      config: {
        options: {
          categories: ['Network'],
        },
      },
    },
  ],
};

export default config;
