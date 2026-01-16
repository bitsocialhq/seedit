<img src="https://github.com/plebeius-eth/assets/blob/main/seedit-logo.png" width="302" height="111">

_Telegram group for this repo https://t.me/seeditreact_

# Seedit

Seedit is a serverless, adminless, decentralized reddit alternative. Seedit is a client (interface) for the Plebbit protocol, which is a decentralized social network where anyone can create and fully own unstoppable communities. Learn more: https://plebbit.com

- Seedit web version: https://seedit.app — or, using Brave/IPFS Companion: https://seedit.eth

### Downloads
- Seedit desktop version (full p2p plebbit node, seeds automatically): available for Mac/Windows/Linux, [download link in the release page](https://github.com/plebbit/seedit/releases/latest)
- Seedit mobile version: available for Android, [download link in the release page](https://github.com/plebbit/seedit/releases/latest)

<br />

<img src="https://github.com/plebeius-eth/assets/blob/main/seedit-screenshot.jpg" width="849">

## How to create a community
In the plebbit protocol, a seedit community is called a _subplebbit_. To run a subplebbit, you can choose between two options:

1. If you prefer to use a **GUI**, download the desktop version of the Seedit client, available for Windows, MacOS and Linux: [latest release](https://github.com/plebbit/seedit/releases/latest). Create a subplebbit using using the familiar old.reddit-like UI, and modify its settings to your liking. The app runs an IPFS node, meaning you have to keep it running to have your board online.
2. If you prefer to use a **command line interface**, install plebbit-cli, available for Windows, MacOS and Linux: [latest release](https://github.com/plebbit/plebbit-cli/releases/latest). Follow the instructions in the readme of the repo. When running the daemon for the first time, it will output WebUI links you can use to manage your subplebbit with the ease of the GUI.

Peers can connect to your subplebbit using any plebbit client, such as Plebchan or Seedit. They only need the subplebbit's address, which is not stored in any central database, as plebbit is a pure peer-to-peer protocol.

### How to add a community to the default list (p/all)
The default list of communities, used on p/all on Seedit, is plebbit's [temporary default subplebbits](https://github.com/plebbit/lists) list. You can open a pull request in that repo to add your subplebbit to the list, or contact devs via telegram [@plebbit](https://t.me/plebbit). In the future, this process will be automated by submitting proposals to a plebbit DAO, using the [plebbit token](https://etherscan.io/token/0xea81dab2e0ecbc6b5c4172de4c22b6ef6e55bd8f).

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

The linux/windows/mac/android build scripts are in https://github.com/plebbit/seedit/blob/master/.github/workflows/release.yml
