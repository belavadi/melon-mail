const fs = require('fs');
const path = require('path');
const prompt = require('prompt');
const config = require('./config.dist.json');

const userArgs = process.argv.slice(2);

prompt.message = '';
const schema = {
  properties: {
    mailContractAddress: {
      description: 'Mail contract address',
      type: 'string',
      default: config.mailContractAddress,
      conform: (value) => {
        if (value === '') return true;
        return /^(0x)?[0-9a-f]{40}$/.test(value);
      },
      message: 'Mail contract address must be a valid ethereum address.',
    },
    mailContractAbi: {
      description: 'Mail contract ABI (default ABI)',
      type: 'string',
    },
    mxResolverAbi: {
      description: 'MX Resolver ABI (default ABI)',
      type: 'string',
    },
    network: {
      description: 'Network string [mainnet, kovan...]',
      type: 'string',
      default: config.network,
    },
    resolverNetwork: {
      description: 'Resolver network string [mainnet, kovan...]',
      type: 'string',
      default: config.resolverNetwork,
    },
    registryAddress: {
      description: 'ENS Registry address',
      type: 'string',
      default: config.registryAddress,
    },
    stringToSign: {
      description: 'String to sign: (Default text - recommended)',
      type: 'string',
      default: config.stringToSign,
    },
    useLocalStorage: {
      description: 'Enable use of local storage',
      type: 'boolean',
      default: config.useLocalStorage,
    },
    defaultDomain: {
      description: 'Default domain',
      type: 'string',
      default: config.defaultDomain,
    },
  },
};

const help = () => {
  console.log('This utility generates the necessary config file, you can add your own config parameters, or leave the default ones.');
  console.log(' ------------------------ ');
  console.log('Mail contract address       - Ethereum address of the deployed PublicEmail contract.\n');
  console.log('Mail contract ABI           - ABI of the deployed PublicEmail contract.\n');
  console.log('MX Resolver ABI             - ABI of the deployed PublicMXResolver contract, if you haven\'t deployed your own custom domain (resolver), you should leave this default.\n');
  console.log('Network string              - String representation of the network on which the PublicEmail contract is deployed.\n');
  console.log('Resolver network string     - String representation of the network on which the PublicMxResolver is deployed, could be different from the network string because some networks don\'t support ENS.\n');
  console.log('ENS Registry address        - Ethereum address of the ENS registry address, not required for mainnet and rinkeby networks.\n');
  console.log('String to sign              - String that is signed when generating keys for encryption / decryption. It\'s recommended that you leave this as is, once you set it ensure that you never change it again, because all users will need to generate new keys.\n');
  console.log('Enable use of local storage - Boolean which sets if the app should use localStorage or not for some additional features.\n');
  console.log('Default domain              - The registered domain that resolves to the current PublicEmail contract.\n');
};

const instructions = () => {
  console.log('This utility will walk you through creating a config file.');
  console.log('Use npm setup help for more documentation.\n');

  prompt.start();
  prompt.get(schema, (err, result) => {
    if (err) { return console.log(err); }
    const file = result;
    if (file.mailContractAbi === '') {
      file.mailContractAbi = config.mailContractAbi;
    }
    if (file.mxResolverAbi === '') {
      file.mxResolverAbi = config.mxResolverAbi;
    }

    return fs.writeFile(path.join(`${__dirname}/config.json`), JSON.stringify(result, null, '\t'), 'utf-8', (error) => {
      if (error) throw err;
    });
  });
};

if (userArgs[0] === 'help') {
  help();
} else {
  instructions();
}