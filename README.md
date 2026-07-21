[![Build Status](https://img.shields.io/github/actions/workflow/status/bitsocialnet/seedit/test.yml?branch=master)](https://github.com/bitsocialnet/seedit/actions/workflows/test.yml)
[![Release](https://img.shields.io/github/v/release/bitsocialnet/seedit)](https://github.com/bitsocialnet/seedit/releases/latest)
[![License](https://img.shields.io/badge/license-GPL--3.0--or--later-blue.svg)](https://github.com/bitsocialnet/seedit/blob/master/LICENSE)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

<img src="https://github.com/plebeius-eth/assets/blob/main/seedit-logo.png" width="302" height="111">

_Telegram group for this repo https://t.me/seeditreact_

# Seedit

Seedit is a serverless, adminless, decentralized and open-source (old)reddit alternative built on the [Bitsocial protocol](https://bitsocial.net). Like reddit, anyone can create a seedit community. Unlike reddit, communities are independently owned, subscriptions point directly to community addresses, and Seedit's default communities can evolve with the network.

- Seedit web version: https://seedit.app — or, using Brave/IPFS Companion: https://seedit.eth

### Downloads
- Seedit desktop version (full p2p bitsocial node, seeds automatically): available for Mac/Windows/Linux, [download link in the release page](https://github.com/bitsocialnet/seedit/releases/latest)
- Seedit mobile version: available for Android, [download link in the release page](https://github.com/bitsocialnet/seedit/releases/latest)

<br />

<img src="https://github.com/plebeius-eth/assets/blob/main/seedit-screenshot.jpg" width="849">

## How to create a community
To run a community, you can choose between two options:

1. If you prefer to use a **GUI**, download the desktop version of the Seedit client, available for Windows, MacOS and Linux: [latest release](https://github.com/bitsocialnet/seedit/releases/latest). Create a community using using the familiar old.reddit-like UI, and modify its settings to your liking. The app runs an IPFS node, meaning you have to keep it running to have your board online.
2. If you prefer to use a **command line interface**, install bitsocial-cli, available for Windows, MacOS and Linux: [latest release](https://github.com/bitsocialnet/bitsocial-cli/releases/latest). Follow the instructions in the readme of the repo. When running the daemon for the first time, it will output WebUI links you can use to manage your community with the ease of the GUI.

Peers can connect to your bitsocial community using any bitsocial client, such as Seedit or [5chan](https://github.com/bitsocialnet/5chan). They only need the community address, which is not stored in any central database, as bitsocial is a pure peer-to-peer protocol.

### How to add a default community

Seedit's versioned default communities are published in Bitsocial's [seedit-default-subscriptions.json list](https://github.com/bitsocialnet/lists/blob/master/seedit-default-subscriptions.json). New accounts subscribe to these communities by default. When the list changes, existing users can review the update and choose which additions to join; Seedit never removes a manually chosen subscription. You can open a pull request in that repository to propose a community for the list.

### How directory routes work

Seedit separates short discovery routes from subscriptions. A route such as `/s/pics` always opens the finalized winner of the `pics` directory, so valuable short routes are not permanently controlled by squatters or global administrators. The topbar therefore displays `pics`, regardless of the winner's exact address. The directory model is designed for decentralized voting; during bootstrap, finalized snapshots are published through [bitsocialnet/lists](https://github.com/bitsocialnet/lists).

Joining still subscribes to that winner's exact community address, and the home feed reads those exact subscriptions directly. Directory winner changes never silently replace a subscription unless the user explicitly enabled automatic switching; otherwise Seedit lets the user switch, keep both communities, or keep the current one. Post permalinks also use exact community addresses so shared links remain durable. See the [directory-routes architecture decision](docs/architecture/directory-routes.md) for the complete model.

## Contributor setup

1. `nvm install && nvm use`
2. Run `corepack enable` once on your machine
3. Use plain `yarn install`, `yarn build`, and `yarn test` from then on

## To run locally

1. `yarn install` to install Seedit dependencies
2. `yarn start` to run the web client

The default web dev server runs at `https://seedit.localhost` via [Portless](https://github.com/vercel-labs/portless), so it can share the same proxy as other Bitsocial projects without colliding on raw Vite ports. On non-`master` branches, or when another legacy process is already holding the canonical route, `yarn start` automatically uses a branch-scoped `*.seedit.localhost` URL instead of failing, and repeated branch-scoped runs keep suffixing (`-2`, `-3`, ...) until they find a free route. To bypass Portless and use plain Vite directly, run `PORTLESS=0 yarn start`; it will probe from port `3000` unless you pin `PORT` yourself.

### Scripts:

- Web client: `yarn start` (`https://seedit.localhost`)
- Electron client (must start web client first): `yarn electron`
- Electron client and don't delete data: `yarn electron:no-delete-data`
- Web client and electron client: `yarn electron:start` (forces `PORTLESS=0 PORT=3000` and uses `http://localhost:3000`)
- Web client and electron client and don't delete data: `yarn electron:start:no-delete-data` (forces `PORTLESS=0 PORT=3000` and uses `http://localhost:3000`)

### Build:

The linux/windows/mac/android build scripts are in https://github.com/bitsocialnet/seedit/blob/master/.github/workflows/release.yml
