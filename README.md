[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

<img src="https://github.com/plebeius-eth/assets/blob/main/seedit-logo.png" width="302" height="111">

_Telegram group for this repo https://t.me/seeditreact_

# Seedit

Seedit is a serverless, adminless, decentralized reddit alternative. Seedit is a client (interface) for the Bitsocial protocol, which is a decentralized social network where anyone can create and fully own unstoppable communities. Learn more: https://bitsocial.net

- Seedit web version: https://seedit.app — or, using Brave/IPFS Companion: https://seedit.eth

### Downloads
- Seedit desktop version (full p2p bitsocial node, seeds automatically): available for Mac/Windows/Linux, [download link in the release page](https://github.com/bitsocialhq/seedit/releases/latest)
- Seedit mobile version: available for Android, [download link in the release page](https://github.com/bitsocialhq/seedit/releases/latest)

<br />

<img src="https://github.com/plebeius-eth/assets/blob/main/seedit-screenshot.jpg" width="849">

## How to create a community
To run a Seedit community, you can choose between two options:

1. If you prefer to use a **GUI**, download the desktop version of the Seedit client, available for Windows, MacOS and Linux: [latest release](https://github.com/bitsocialhq/seedit/releases/latest). Create a community using using the familiar old.reddit-like UI, and modify its settings to your liking. The app runs an IPFS node, meaning you have to keep it running to have your board online.
2. If you prefer to use a **command line interface**, install bitsocial-cli, available for Windows, MacOS and Linux: [latest release](https://github.com/bitsocialhq/bitsocial-cli/releases/latest). Follow the instructions in the readme of the repo. When running the daemon for the first time, it will output WebUI links you can use to manage your community with the ease of the GUI.

Peers can connect to your community using any Bitsocial client, such as 5chan or Seedit. They only need the community address, which is not stored in any central database, as Bitsocial is a pure peer-to-peer protocol.

## To run locally

1. Install Node v22 (Download from https://nodejs.org)
2. Install Yarn: `npm install -g yarn`
3. `yarn install --frozen-lockfile` to install Seedit dependencies
4. `yarn start` to run the web client

### Scripts:

- Web client: `yarn start`
- Electron client (must start web client first): `yarn electron`
- Electron client and don't delete data: `yarn electron:no-delete-data`
- Web client and electron client: `yarn electron:start`
- Web client and electron client and don't delete data: `yarn electron:start:no-delete-data`

### Build:

The linux/windows/mac/android build scripts are in https://github.com/bitsocialhq/seedit/blob/master/.github/workflows/release.yml
