# Melon Mail

[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![dependencies](https://david-dm.org/DecenterApps/MelonMail.svg)](https://david-dm.org/DecenterApps/MelonMail)

Melon Mail is a secure and decentralized email-like system that relies on Ethereum and IPFS.

[Original idea of Melon Mail developped under GPLv3 license](https://github.com/DevanaLabs/lemon.email-dApp) by [Devana Labs](http://labs.devana.rs/) under leadership of [Vladimir Prevolac](https://www.linkedin.com/in/vladimirprelovac) and has since been completely rewritten and is maintained by [Decenter](https://decenter.com/) under leadership of [Andrej Cvoro](https://rs.linkedin.com/in/andrejcvoro).

## Project structure
```
Project Root/
│
├── config/ - Config files
│
├── public/ - Bundled files
│
├── solidity/ - Contract code
│
├── src/
│   ├── actions/ - Redux actions / Async calls
│   ├── assets/ - Project assets
│   ├── components/ - React components
│   │   ├── App/  - App wrapper
│   │   ├── Auth/ - Auth page 
│   │   ├── Mail/ - Main mail page
│   │   └── Router/ - Basic helper router
│   ├── reducers/ - Redux reducers / Application state
│   ├── services/ - Helper services wrapping ipfs, ethereum...
│   ├── style/
│   └── index.jsx - Entry react file
```
## Getting started
### Running locally
```
npm install             Install dependencies 
npm run setup           Setup config parameters
npm run start           Start the app
```

When running `npm run setup` you can provide your custom config parameters, otherwise just skip with <kbd>Enter</kbd> key.  If you need help just use `npm run setup help`.

Then visit [http://localhost:3300/](http://localhost:3300/) to use your app.

### Working on solidity contracts
In the solidity folder you'll find all the contracts as a truffle project (we are using truffle 4).
You need to have truffle 4 installed as a global command and can use the built in truffle development blockchain.

```truffle develop``` - to start the development blockchain (you have to be in /solidity folder)

After that in the truffle console you can migrate and test your contracts.

* Tests will require Node version that is greater than Node 7.0

```
migrate
test
```

If you want to deploy the contracts to kovan use ```migrate --network kovan ``` in solidity/truffle.js you have
the deployment config for the network you can use your own local node or infura.io (supply the mnemonic 12 keyword seed of your wallet to deploy with infura)
Add the new abi and contract address to the config.json file if you want to test your changes in the frontend.

### Production deploy
```
npm install             Install dependencies 
npm run setup           Setup config parameters
npm run prod            Build a minified bundle
```
Your bundled files will be at the `public/` folder, after that you just need to host them somewhere.

#### Hosting on IPFS
Follow the instructions for production deploy and proceed. 

Install IPFS [https://ipfs.io/docs/getting-started/](https://ipfs.io/docs/getting-started/)
```
ipfs add -r public/
```
You will be given a set of hashes corresponding to the files in the public folder, use the most bottom one for the public folder.
 
It should look something like this `added QmVN4UWCeqRe9LcqicyNzxnb55yK7sUxBHuHRRFVFt82WN public`
 
Visit [http://[insert trusted ipfs gateway]/ipfs/QmVN4UWCeqRe9LcqicyNzxnb55yK7sUxBHuHRRFVFt82WN](https://ipfs.io/ipfs/#your_ipfs_hash#/)
 
####  * Note when hosting on IPFS * 
Hosting on IPFS comes with some disadvantadges, localStorage becomes unsecure because it's available cross domain and other apps hosted on IPFS can interfere with your data, when you host MelonMail on IPFS you should disable local storage
features by setting `Enable use of local storage` to `false` during the setup wizard, or manually setting `useLocalStorage` to `false` in `config/config.json`
