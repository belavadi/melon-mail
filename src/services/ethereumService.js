import util from 'ethereumjs-util';
import TX from 'ethereumjs-tx';
import uniqBy from 'lodash/uniqBy';
import Ethers from 'ethers';
import bip39 from 'bip39';
import ENS from 'ethjs-ens';
import config from '../../config/config.json';
import { namehash, keccak256, createFilter } from './helperService';

const ENS_MX_INTERFACE_ID = '0x7d753cf6';

const networks = {
  3: 'ropsten',
  42: 'kovan',
  4: 'rinkeby',
  2: 'morden',
  1: 'mainnet',
};

const getEvents = async (wallet, event, address, filter, fromBlock = 0, toBlock = 'latest') => {
  try {
    const logs = await wallet.provider.getLogs({
      fromBlock,
      toBlock,
      address,
      topics: [
        ...event.topics,
        ...createFilter(filter, event),
      ],
    });
    return logs.map(log => ({
      ...event.parse(log.topics, log.data),
      blockNumber: log.blockNumber,
      transactionHash: log.transactionHash,
    }));
  } catch (err) {
    console.error(err);
    throw Error('Event fetching failed.');
  }
};

const getBalance = wallet => new Promise((resolve, reject) => {
  wallet.provider.getBalance(wallet.address)
    .then(balance => resolve(Ethers.utils.formatEther(balance)))
    .catch(error => reject(error));
});

const getBlockNumber = async (wallet) => {
  try {
    return await wallet.provider.getBlockNumber(wallet);
  } catch (e) {
    throw Error(e.message);
  }
};

const listenEvent = (wallet, event, filter, callback) => {
  wallet.provider.on([
    ...event.topics,
    ...createFilter(filter, event),
  ], (log) => {
    callback({
      ...event.parse(log.topics, log.data),
      blockNumber: log.blockNumber,
      transactionHash: log.transactionHash,
    });
  });
};

const checkRegistration = async (wallet) => {
  if (!wallet) {
    throw Error('No wallet provided!');
  }
  const event = wallet.mailContract.interface.events.UserRegistered();
  try {
    const events = await getEvents(wallet, event, wallet.mailContract.address, {
      addr: wallet.address,
    });

    if (events.length === 0) {
      return {
        notRegistered: true,
        message: 'User not registered!',
      };
    }
    return {
      mailAddress: events[0].encryptedUsername,
      address: events[0].address,
      startingBlock: events[0].blockNumber,
    };
  } catch (err) {
    console.error(err);
    throw Error('Event fetching failed.');
  }
};

const createWallet = async (importedMnemonic, decryptedWallet) => {
  const mnemonic = importedMnemonic || bip39.generateMnemonic();
  const wallet = decryptedWallet || new Ethers.Wallet.fromMnemonic(mnemonic);
  const { kovan, mainnet } = Ethers.providers.networks;
  const decenterKovanProvider = new Ethers.providers.JsonRpcProvider('https://kovan.decenter.com', kovan);
  const melonKovanProvider = new Ethers.providers.JsonRpcProvider('https://kovan.melonport.com', kovan);
  const localKovanProvider = new Ethers.providers.JsonRpcProvider('http://localhost:8545/', kovan);

  const decenterMainProvider = new Ethers.providers.JsonRpcProvider('https://mainnet.decenter.com', mainnet);
  const melonMainProvider = new Ethers.providers.JsonRpcProvider('https://mainnet.melonport.com', mainnet);
  const localMainProvider = new Ethers.providers.JsonRpcProvider('http://localhost:8545/', mainnet);

  wallet.provider = new Ethers.providers.FallbackProvider([
    melonKovanProvider,
    decenterKovanProvider,
    localKovanProvider,
  ]);

  wallet.mainProvider = new Ethers.providers.FallbackProvider([
    melonMainProvider,
    decenterMainProvider,
    localMainProvider,
  ]);

  console.log(wallet);
  wallet.publicKey = util.bufferToHex(util.privateToPublic(wallet.privateKey));
  console.log(wallet);

  wallet.balance = parseFloat(await getBalance(wallet));

  wallet.mailContract = new Ethers.Contract(
    config.mailContractAddress,
    config.mailContractAbi,
    wallet,
  );
  return wallet;
};

const checkMailAddress = async (wallet, mailAddress) => {
  if (!wallet) {
    throw Error('No wallet provided!');
  }
  let events;
  const event = wallet.mailContract.interface.events.UserRegistered();

  try {
    events = await getEvents(wallet, event, wallet.mailContract.address, {
      usernameHash: keccak256(mailAddress),
    });
  } catch (e) {
    throw Error('Could not get events from the blockchain.');
  }

  if (events.length > 0) {
    throw Error('Username is already taken.');
  }

  return {
    isAvailable: true,
    message: 'Username is available',
  };
};

/* Calls registerUser function from the contract code */

const _registerUser = async (wallet, params, mailAddress, overrideOptions) => {
  if (!wallet) {
    throw Error('No wallet provided!');
  }
  try {
    await wallet.mailContract.registerUser(...params);
  } catch (e) {
    throw Error(e.message);
  }

  try {
    const startingBlock = await getBlockNumber(wallet);
    return {
      mailAddress,
      startingBlock,
    };
  } catch (e) {
    console.log(e);
    return {
      mailAddress,
      startingBlock: 0,
    };
  }
};

/* Scans the blockchain to find the public key for a user */

const _getPublicKey = async (wallet, mailAddress, optionalContract) => {
  const selectedContract = optionalContract !== undefined
    ? optionalContract : wallet.mailContract;
  const event = wallet.mailContract.interface.events.UserRegistered();
  try {
    const events = await getEvents(wallet, event, selectedContract.address, {
      usernameHash: keccak256(mailAddress),
    });

    if (!events.length) {
      return {
        message: 'User not found!',
        events,
      };
    }
    return {
      externalMailContract: optionalContract,
      address: events[0].addr,
      publicKey: events[0].publicKey,
    };
  } catch (e) {
    throw Error(e.message);
  }
};

/* Subscribes to the register event */
const listenUserRegistered = (wallet, callback) => {
  if (!wallet) {
    throw Error('No wallet provided!');
  }
  const event = wallet.mailContract.interface.events.UserRegistered();

  listenEvent(wallet, event, { addr: wallet.address }, (eventData) => {
    console.log('USER Registered');
    console.log(eventData);
    callback(eventData);
    wallet.provider.removeListener(event.topics);
  });
};

/* Subscribes to the mail send event */

const listenForMails = (wallet, callback) => {
  if (!wallet) {
    throw Error('No wallet provided!');
  }
  const event = wallet.mailContract.interface.events.EmailSent();

  listenEvent(wallet, event, { to: wallet.address }, (eventData) => {
    callback(eventData, 'inbox');
  });

  listenEvent(wallet, event, { from: wallet.address }, (eventData) => {
    callback(eventData, 'outbox');
  });
};

const getMails = async (wallet, folder, fetchToBlock, blocksToFetch) => {
  if (!wallet) {
    throw Error('No wallet provided!');
  }
  const currentBlock = await getBlockNumber(wallet);
  const event = wallet.mailContract.interface.events.EmailSent();
  const filter = folder === 'inbox' ? { to: wallet.address } : { from: wallet.address };
  const fetchTo = fetchToBlock === null ? currentBlock : fetchToBlock;
  try {
    const events = await getEvents(wallet,
      event,
      wallet.mailContract.address,
      filter,
      fetchTo - blocksToFetch <= 0 ? 0 : fetchTo - blocksToFetch,
      fetchTo <= 0 ? 0 : fetchTo);
    const filteredEvents = uniqBy(events.reverse(), 'threadId');

    return {
      mailEvents: filteredEvents,
      fromBlock: fetchTo - blocksToFetch,
    };
  } catch (e) {
    throw Error('Event fetching failed.');
  }
};

const getThread = async (wallet, threadId, afterBlock) => {
  if (!wallet) {
    throw Error('No wallet provided!');
  }
  const event = wallet.mailContract.interface.events.EmailSent();

  try {
    const events = await getEvents(wallet,
      event,
      wallet.mailContract.address,
      {
        threadId,
      },
      afterBlock);

    return events.pop();
  } catch (e) {
    throw Error('Could not fetch events.');
  }
};

const _sendMail = (wallet, params, externalMailContract, overrideOptions) => {
  if (externalMailContract !== undefined) {
    return wallet.mailContract.sendExternalEmail(
      externalMailContract.address,
      ...params,
      overrideOptions,
    );
  }

  return wallet.mailContract.sendEmail(...params);
};

const fetchAllEvents = async (wallet, folder) => {
  if (!wallet) {
    throw Error('No wallet provided!');
  }
  const filter = folder === 'inbox' ? { to: wallet.address } : { from: wallet.address };
  const event = wallet.mailContract.interface.events.EmailSent();

  try {
    const events = await getEvents(wallet, event, wallet.mailContract.address, filter, 0);

    return uniqBy(
      events,
      folder === 'inbox' ? 'from' : 'to',
    );
  } catch (e) {
    throw Error('Could not fetch logs.');
  }
};

const getAddressInfo = (wallet, address) => {
  const event = wallet.mailContract.interface.events.UserRegistered();
  try {
    return getEvents(wallet, event, wallet.mailContract.address, {
      addr: address,
    });
  } catch (e) {
    throw Error('Could not fetch events.');
  }
};

const _updateContacts = async (wallet, hashName, ipfsHash) => {
  if (!wallet) {
    throw Error('No wallet provided!');
  }
  try {
    return await wallet.mailContract.updateContacts(hashName, ipfsHash);
  } catch (e) {
    throw Error(e.message);
  }
};

const getContactsForUser = async (wallet, usernameHash) => {
  if (!wallet) {
    throw Error('No wallet provided!');
  }
  const event = wallet.mailContract.interface.events.ContactsUpdated();
  try {
    const filter = { usernameHash };
    const events = await getEvents(wallet, event, wallet.mailContract.address, filter);

    return events.length > 0 ? events.pop() : null;
  } catch (err) {
    console.error(err);
    throw Error('Event fetching failed.');
  }
};

// TODO: Rewrite using Ethers.js lib

const getResolverForDomain = (wallet, domain) =>
  new Promise((resolve, reject) => {
    const provider = config.network === config.resolverNetwork
      ? wallet.provider : wallet.mainProvider;
    const ens = new ENS({
      provider,
      network: Object.keys(networks).find(key => networks[key] === config.resolverNetwork),
      registryAddress: config.registryAddress,
    });
    ens.registry.resolver(namehash(domain), (error, address) => {
      if (error) {
        return reject({
          message: error,
        });
      }
      return resolve(address[0]);
    });
  });

/* Returns address of contract on MX record of given domain on given resolver */

const resolveMx = async (wallet, resolverAddr, domain) => {
  const provider = config.network === config.resolverNetwork
    ? wallet.provider : wallet.mainProvider;
  const mxResolverContract = new Ethers.Contract(
    resolverAddr,
    config.mxResolverAbi,
    provider,
  );
  const supportsMx = await mxResolverContract.supportsInterface(ENS_MX_INTERFACE_ID);
  if (!supportsMx) throw Error('MX record not supported!');
  return mxResolverContract.mx(namehash(domain));
};

const getMailContract = async (wallet, domain) => {
  const resolverAddress = await getResolverForDomain(wallet, domain);
  const resolvedMailContractAddress = await resolveMx(wallet, resolverAddress, domain);
  return new Ethers.Contract(
    resolvedMailContractAddress,
    config.mailContractAbi,
    wallet,
  );
};

const getPublicKeyForAddress = async (wallet, address) => {
  const apiKey = '56P5HQMFIUXKNIS6Y5YSE8676M15WUM9CD';
  const network = config.network === 'mainnet' ? '' : `-${config.network}`;
  const api = `https://api${network}.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${apiKey}`;
  const { kovan } = Ethers.providers.networks;
  try {
    const data = (await (await fetch(api)).json());
    if (data.message !== 'OK' && data.status === '1') throw Error('Etherscan API not available.');
    if (data.result.length === 0) throw Error('The account doesn\'t have any transactions.');

    let transaction;
    for (let i = 0; i < data.result.length; i += 1) {
      if (address.toLowerCase() === data.result[i].from.toLowerCase()) {
        transaction = data.result[i];
        break;
      }
    }

    if (transaction === undefined) throw Error('The account didn\'t send any transactions.');

    const transactionData = await wallet.provider.getTransaction(transaction.hash);

    const parsedTransaction = new TX(new Buffer(transactionData.raw.slice(2), 'hex'));
    const publicKey = util.bufferToHex(parsedTransaction.getSenderPublicKey());
    console.log(publicKey);
    // TODO: Check on which contract is the account in question
    return {
      externalMailContract: undefined,
      address,
      publicKey,
    };
  } catch (e) {
    console.log(e);
  }
};

const resolveUser = async (wallet, email, domain, isExternalMail) => {
  if (util.isValidAddress(email)) {
    return getPublicKeyForAddress(wallet, email);
  }

  if (!isExternalMail) {
    return _getPublicKey(wallet, email);
  }

  const resolvedMailContract = await getMailContract(domain);
  if (resolvedMailContract.address === config.mailContractAddress) {
    return _getPublicKey(wallet, email);
  }

  return _getPublicKey(wallet, email, resolvedMailContract);
};

export default {
  createWallet,
  listenForMails,
  listenUserRegistered,
  checkRegistration,
  checkMailAddress,
  fetchAllEvents,
  resolveUser,
  getMails,
  getBalance,
  getThread,
  getAddressInfo,
  getContactsForUser,
  _registerUser,
  _getPublicKey,
  _sendMail,
  _updateContacts,
};
