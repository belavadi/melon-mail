import Web3 from 'web3';
import util from 'ethereumjs-util';
import uniqBy from 'lodash/uniqBy';
import Ethers from 'ethers';
import bip39 from 'bip39';
import ENS from 'ethjs-ens';
import config from '../../config/config.json';
import { generateKeys, encrypt, decrypt } from './cryptoService';
import { namehash } from './helperService';

const ENS_MX_INTERFACE_ID = '0x7d753cf6';

const networks = {
  3: 'ropsten',
  42: 'kovan',
  4: 'rinkeby',
  2: 'morden',
  1: 'mainnet',
};

const filterLogs = (logs, filter) =>
  logs.filter(log => Object.keys(filter).filter(key => log[key] === filter[key]).length > 0);

const getEvents = async (wallet, event, address, filter, fromBlock = 0, toBlock = 'latest') => {
  try {
    const logs = await wallet.provider.getLogs({
      fromBlock,
      toBlock,
      address,
      topics: event.topics,
    });
    const parsedEvents = logs.map(log => ({
      ...event.parse(log.topics, log.data),
      blockNumber: log.blockNumber,
      transactionHash: log.transactionHash,
    }));

    if (!filter) return parsedEvents;

    return filterLogs(parsedEvents, filter);
  } catch (err) {
    console.error(err);
    throw Error('Event fetching failed.');
  }
};

const listenEvent = (wallet, event, callback) => {
  wallet.provider.on(event.topics, log => callback(event.parse(log.topics, log.data)));
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
    console.log(events);
    return {
      mailAddress: events[0].encryptedUsername,
      address: events[0].address,
      startingBlock: events[0].startingBlock,
    };
  } catch (err) {
    console.error(err);
    throw Error('Event fetching failed.');
  }
};

const createWallet = (importedMnemonic) => {
  const mnemonic = importedMnemonic || bip39.generateMnemonic();
  const wallet = new Ethers.Wallet.fromMnemonic(mnemonic);
  const decenterKovanProvider = new Ethers.providers.JsonRpcProvider('https://kovan.decenter.com', 'kovan');
  const melonKovanProvider = new Ethers.providers.JsonRpcProvider('https://kovan.melonport.com', 'kovan');
  const localKovanProvider = new Ethers.providers.JsonRpcProvider('http://localhost:8545/', 'kovan');

  const decenterMainProvider = new Ethers.providers.JsonRpcProvider('https://mainnet.decenter.com', 'mainnet');
  const melonMainProvider = new Ethers.providers.JsonRpcProvider('https://mainnet.melonport.com', 'mainnet');
  const localMainProvider = new Ethers.providers.JsonRpcProvider('http://localhost:8545/', 'mainnet');

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

  wallet.publicKey = util.bufferToHex(util.privateToPublic(wallet.privateKey));

  const mailContract = new Ethers.Contract(
    config.mailContractAddress,
    config.mailContractAbi,
    wallet,
  );
  console.log({
    ...wallet,
    mailContract,
  });
  return {
    ...wallet,
    mailContract,
  };
};

const getBalance = wallet => new Promise((resolve, reject) => {
  wallet.provider.getBalance(wallet.address)
    .then(balance => resolve(Ethers.utils.formatEther(balance)))
    .catch(error => reject(error));
});

const signString = (account, stringToSign) =>
  new Promise((resolve, reject) => {
    // Deprecated sign function
    //
    // web3.personal.sign(web3.fromUtf8(stringToSign), account, (error, result) => {
    //   if (error) {
    //     return reject(error);
    //   }
    //   return resolve(result);
    // });
    const msgParams = [{
      type: 'string',
      name: 'Message',
      value: stringToSign,
    }];
    web3.currentProvider.sendAsync({
      method: 'eth_signTypedData',
      params: [msgParams, account],
      from: account,
    }, (err, data) => {
      if (err || data.error) return reject(err);
      return resolve(data.result);
    });
  });

const getBlockNumber = async (wallet) => {
  try {
    return await wallet.provider.getBlockNumber();
  } catch (e) {
    throw Error('Could not fetch block number.');
  }
};

const checkMailAddress = async (wallet, mailAddress) => {
  if (!wallet) {
    throw Error('No wallet provided!');
  }
  let events;
  const { keccak256, toUtf8Bytes } = Ethers.utils;
  const event = wallet.mailContract.interface.events.UserRegistered();

  try {
    events = await getEvents(wallet, event, wallet.mailContract.address, {
      usernameHash: keccak256(toUtf8Bytes(mailAddress)),
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

const _registerUser = async (wallet, mailAddress) => {
  if (!wallet) {
    throw Error('No wallet provided!');
  }

  const { keccak256, toUtf8Bytes } = Ethers.utils;
  const encryptedUsername = encrypt({
    privateKey: wallet.privateKey,
    publicKey: wallet.publicKey,
  }, mailAddress);

  try {
    await wallet.mailContract.registerUser(
      keccak256(toUtf8Bytes(mailAddress)),
      encryptedUsername,
      wallet.publicKey);
  } catch (e) {
    throw Error(e.message);
  }

  try {
    const startingBlock = await getBlockNumber();
    return {
      mailAddress,
      startingBlock,
    };
  } catch (e) {
    return {
      mailAddress,
      startingBlock: 0,
    };
  }
};

/* Scans the blockchain to find the public key for a user */

const _getPublicKey = async (wallet, mailAddress, optionalContract) => {
  const { keccak256, toUtf8Bytes } = Ethers.utils;
  const selectedContract = optionalContract !== undefined
    ? optionalContract : wallet.mailContract;
  const event = optionalContract.interface.events.UserRegistered();
  try {
    const events = await getEvents(wallet, event, selectedContract, {
      usernameHash: keccak256(toUtf8Bytes(mailAddress)),
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
const listenUserRegistered = callback =>
  getAccount()
    .then((account) => {
      if (!account) {
        return null;
      }

      return getBlockNumber()
        .then((startingBlock) => {
          const listener = eventContract.UserRegistered(
            {
              addr: account,
            },
            {
              fromBlock: startingBlock,
              toBlock: 'latest',
            },
          )
            .watch((err, event) => {
              if (err) return;
              callback(event);
              listener.stopWatching();
            });
        });
    });

/* Subscribes to the mail send event */

const listenForMails = async (wallet, callback) => {
  if (!wallet) {
    throw Error('No wallet provided!');
  }
  const event = wallet.mailContract.interface.events.EmailSent();
  const startingBlock = await getBlockNumber(wallet);

  listenEvent(wallet, event, (eventData) => {
  });

  eventContract.EmailSent(
    {
      to: account,
    },
    {
      fromBlock: startingBlock,
      toBlock: 'latest',
    },
  )
    .watch((err, event) => {
      if (err) console.log(err);
      else callback(event, 'inbox');
    });

  eventContract.EmailSent(
    {
      from: account,
    },
    {
      fromBlock: startingBlock,
      toBlock: 'latest',
    },
  )
    .watch((err, event) => {
      if (err) console.log(err);
      else callback(event, 'outbox');
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
      wallet.mailContract,
      filter,
      fetchTo - blocksToFetch,
      fetchTo);
    const filteredEvents = uniqBy(events.reverse(), 'threadId');

    return {
      mailEvents: filteredEvents,
      fromBlock: fetchTo - blocksToFetch,
    };
  } catch (e) {
    throw Error('Event fetching failed.');
  }
};

const getThread = (threadId, afterBlock) =>
  new Promise((resolve, reject) => {
    eventContract.EmailSent(
      {
        threadId,
      },
      {
        fromBlock: afterBlock,
        toBlock: 'latest',
      },
    )
      .get((err, events) => {
        if (err) {
          reject({
            message: err,
          });
        }

        resolve(events.pop());
      });
  });

const _sendEmail = (toAddress, mailHash, threadHash, threadId, externalMailContract) =>
  new Promise((resolve, reject) => {
    getAccount()
      .then((account) => {
        if (externalMailContract !== undefined) {
          return mailContract.sendExternalEmail(
            externalMailContract.address,
            toAddress,
            mailHash,
            threadHash,
            threadId,
            { from: account },
            (error, result) => {
              if (error) {
                return reject({
                  message: error,
                });
              }

              return resolve(result);
            });
        }

        return mailContract.sendEmail(toAddress, mailHash, threadHash, threadId,
          { from: account }, (error, result) => {
            if (error) {
              return reject({
                message: error,
              });
            }

            return resolve(result);
          });
      });
  });

const fetchAllEvents = async (wallet, folder) => {
  if (!wallet) {
    throw Error('No wallet provided!');
  }
  const filter = folder === 'inbox' ? { to: wallet.address } : { from: wallet.address };
  const event = wallet.mailContract.interface.events.EmailSent();

  try {
    const logs = await wallet.provider.getLogs({
      fromBlock: 0,
      address: wallet.mailContract.address,
      topics: event.topics,
    });

    const parsedEvents = logs.map(log => ({
      ...event.parse(log.topics, log.data),
      blockNumber: log.blockNumber,
    }));

    return uniqBy(
      filterLogs(parsedEvents, filter),
      folder === 'inbox' ? 'from' : 'to',
    );
  } catch (e) {
    throw Error('Could not fetch logs.');
  }
};

const getAddressInfo = address =>
  new Promise((resolve) => {
    eventContract.UserRegistered(
      {
        addr: address,
      },
      {
        fromBlock: 0,
        toBlock: 'latest',
      },
    )
      .get((err, events) => {
        if (err) {
          console.log(err);
        }

        resolve(events);
      });
  });

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
    const logs = await wallet.provider.getLogs({
      fromBlock: 0,
      address: wallet.mailContract.address,
      topics: event.topics,
    });
    const parsedEvents = logs.map(log => ({
      ...event.parse(log.topics, log.data),
      blockNumber: log.blockNumber,
    }));
    const filteredEvents = filterLogs(parsedEvents, { usernameHash });

    return filteredEvents.length > 0 ? filteredEvents.pop() : null;
  } catch (err) {
    console.error(err);
    throw Error('Event fetching failed.');
  }
};

const getResolverForDomain = (wallet, domain) =>
  new Promise((resolve, reject) => {
    const provider = config.network === config.resolverNetwork ? wallet.provider : wallet.mainProvider;
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
  console.log(supportsMx);
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

const resolveUser = async (wallet, email, domain, isExternalMail) => {
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
  signString,
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
  _sendEmail,
  _updateContacts,
};
