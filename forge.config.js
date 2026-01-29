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
    asar: {
      unpack: [
        // Unpack kubo binary (only the bin folder with the actual executable)
        '**/kubo/bin/**',
        '**/kubo/kubo/**',
        // Unpack native .node modules
        '**/*.node',
      ],
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
    ],
    extraResource: [],
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
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
  ],
};

export default config;
