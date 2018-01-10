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

const checkRegistration = async (wallet) => {
  if (!wallet) {
    throw Error('No wallet provided!');
  }
  const event = wallet.mailContract.interface.events.UserRegistered();
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
    const filteredEvents = filterLogs(parsedEvents, { addr: wallet.address });

    if (filteredEvents.length === 0) {
      return {
        notRegistered: true,
        message: 'User not registered!',
      };
    }
    console.log(filteredEvents);
    return {
      mailAddress: filteredEvents[0].encryptedUsername,
      address: filteredEvents[0].address,
      startingBlock: filteredEvents[0].startingBlock,
    };
  } catch (err) {
    console.error(err);
    throw Error('Event fetching failed.');
  }
};

const createWallet = (importedMnemonic) => {
  const mnemonic = importedMnemonic || bip39.generateMnemonic();
  const wallet = new Ethers.Wallet.fromMnemonic(mnemonic);
  const decenterProvider = new Ethers.providers.JsonRpcProvider('https://kovan.decenter.com', 'kovan');
  const melonProvider = new Ethers.providers.JsonRpcProvider('https://kovan.melonport.com', 'kovan');
  const localProvider = new Ethers.providers.JsonRpcProvider('http://localhost:8545/', 'kovan');

  wallet.provider = new Ethers.providers.FallbackProvider([
    decenterProvider,
    melonProvider,
    localProvider,
  ]);

  wallet.publicKey = util.bufferToHex(util.privateToPublic(wallet.privateKey));

  const mailContract = new Ethers.Contract(
    config.mailContractAddress,
    config.mailContractAbi,
    wallet,
  );

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

const checkMailAddress = async (mailAddress, wallet) => {
  if (!wallet) {
    throw Error('No wallet provided!');
  }
  let logs;
  const { keccak256, toUtf8Bytes } = Ethers.utils;
  const event = wallet.mailContract.interface.events.UserRegistered();

  try {
    logs = await wallet.provider.getLogs({
      fromBlock: 0,
      address: wallet.mailContract.address,
      topics: event.topics,
    });
  } catch (e) {
    throw Error('Could not get events from the blockchain.');
  }
  const parsedEvents = logs.map(log => ({
    ...event.parse(log.topics, log.data),
    blockNumber: log.blockNumber,
  }));
  console.log(Ethers);
  const filteredEvents = filterLogs(parsedEvents, {
    usernameHash: keccak256(toUtf8Bytes(mailAddress)),
  });

  if (filteredEvents.length > 0) {
    throw Error('Username is already taken.');
  }

  return {
    isAvailable: true,
    message: 'Username is available',
  };
};

/* Calls registerUser function from the contract code */

const _registerUser = async (mailAddress, wallet) => {
  const { keccak256, toUtf8Bytes } = Ethers.utils;
  const encryptedUsername = encrypt({
    privateKey: wallet.privateKey,
    publicKey: wallet.publicKey.substr(2),
  }, mailAddress);

  try {
    await wallet.mailContract.registerUser(
      keccak256(toUtf8Bytes(mailAddress)),
      encryptedUsername,
      wallet.publicKey);
  } catch (e) {
    console.log('FAILED EXECUTING FUNCTION.');
    console.log(e);
    throw Error(e.toString());
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

const _getPublicKey = (email, optionalContract) =>
  new Promise((resolve, reject) => {
    const selectedContract = optionalContract !== undefined
      ? optionalContract : eventContract;

    try {
      selectedContract.UserRegistered(
        {
          usernameHash: web3.sha3(email),
        },
        {
          fromBlock: 0,
          toBlock: 'latest',
        },
      )
        .get((err, events) => {
          if (err) {
            reject({
              message: err,
              events: null,
            });
          }

          if (!events.length) {
            return reject({
              message: 'User not found!',
              events,
            });
          }
          return resolve({
            externalMailContract: optionalContract,
            address: events[0].args.addr,
            publicKey: events[0].args.publicKey,
          });
        });
    } catch (e) {
      reject(e);
    }
  });

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

const listenForMails = callback =>
  getAccount()
    .then((account) => {
      if (!account) {
        return null;
      }
      return getBlockNumber()
        .then((startingBlock) => {
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
        });
    });

const getMails = (folder, fetchToBlock, blocksToFetch) =>
  new Promise((resolve, reject) => {
    getAccount()
      .then((account) => {
        if (!account) {
          return reject({
            message: 'Account not found.',
          });
        }
        return getBlockNumber()
          .then((currentBlock) => {
            const filter = folder === 'inbox' ? { to: account } : { from: account };
            const fetchTo = fetchToBlock === null ? currentBlock : fetchToBlock;
            eventContract.EmailSent(
              filter,
              {
                fromBlock: fetchTo - blocksToFetch,
                toBlock: fetchTo,
              },
            )
              .get((err, events) => {
                if (err) {
                  reject({
                    message: err,
                  });
                }

                const filteredEvents = uniqBy(events.reverse(), 'args.threadId');
                return resolve({
                  mailEvents: filteredEvents,
                  fromBlock: fetchTo - blocksToFetch,
                });
              });
          });
      });
  });

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

const signIn = mailAddress => new Promise((resolve, reject) => {
  getAccount()
    .then((account) => {
      if (!account) {
        return reject({
          message: 'Account not found.',
        });
      }
      return signString(account, config.stringToSign)
        .then((signedString) => {
          const { privateKey, publicKey } = generateKeys(signedString);
          resolve({
            status: true,
            privateKey,
            publicKey,
            mailAddress: decrypt({ privateKey, publicKey }, mailAddress),
          });
        })
        .catch((error) => {
          reject({
            message: error,
          });
        });
    });
});

const fetchAllEvents = folder =>
  new Promise((resolve, reject) => {
    getAccount()
      .then((account) => {
        if (!account) {
          return reject({
            message: 'Account not found.',
          });
        }
        const filter = folder === 'inbox' ? { to: account } : { from: account };
        return eventContract.EmailSent(
          filter,
          {
            fromBlock: 0,
            toBlock: 'latest',
          },
        )
          .get((err, events) => {
            if (err) {
              reject({
                message: err,
              });
            }

            const filteredEvents = uniqBy(events, folder === 'inbox' ? 'args.from' : 'args.to');
            return resolve(filteredEvents);
          });
      });
  });

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

const updateContactsEvent = (hashName, ipfsHash) =>
  new Promise((resolve, reject) => {
    getAccount()
      .then((account) => {
        mailContract.updateContacts(hashName, ipfsHash, { from: account }, (err, resp) => {
          if (err) {
            reject(err);
          }

          return resolve(resp);
        });
      });
  });

const getContactsForUser = userHash =>
  new Promise((resolve, reject) => {
    eventContract.ContactsUpdated(
      {
        usernameHash: userHash,
      },
      {
        fromBlock: 0,
        toBlock: 'latest',
      },
    )
      .get((err, events) => {
        if (err) {
          reject(err);
        }

        if (events.length > 0) {
          resolve(events.pop());
        } else {
          resolve(null);
        }
      });
  });

const getResolverForDomain = domain =>
  new Promise((resolve, reject) => {
    const provider = config.network === config.resolverNetwork ?
      web3.currentProvider :
      new web3.providers.HttpProvider(`https://${config.resolverNetwork}.infura.io`);
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

const resolveMx = (resolverAddr, domain) =>
  new Promise((resolve, reject) => {
    getAccount()
      .then((account) => {
        const _web3 = config.network === config.resolverNetwork ?
          web3 : new Web3(new web3.providers.HttpProvider(`https://${config.resolverNetwork}.infura.io`));
        const mxResolverContract = _web3.eth.contract(config.mxResolverAbi).at(resolverAddr);
        mxResolverContract.supportsInterface(ENS_MX_INTERFACE_ID, { from: account }, (err, res) => {
          if (err) reject(err);
          if (!res) reject(false);

          mxResolverContract.mx(namehash(domain), { from: account }, (errMx, mailContractAddr) => {
            if (errMx) reject(errMx);
            resolve(mailContractAddr);
          });
        });
      });
  });

// Used for testing purposes
// const setMxRecord = () =>
//   new Promise((resolve, reject) => {
//     getResolverForDomain('decenter-test.test')
//       .then((resolverAddr) => {
//         web3.eth.getAccounts()
//           .then((accounts) => {
//             const mxResolverContract = new web3.eth.Contract(
//               config.mxResolverAbi, resolverAddr, {
//               from: accounts[0],
//             });
//             console.log(mxResolverContract);
//             mxResolverContract.methods.setMxRecord(namehash('decenter-test.test'),
// '              0x372d826abb22ed3546947a32977745830164717b')
//               .send((errMx, data) => {
//                 if (errMx) reject(errMx);
//                 console.log(data);
//                 resolve(data);
//               });
//           });
//       });
//   });

const getMailContract = domain =>
  new Promise((resolve, reject) => {
    getResolverForDomain(domain)
      .then(resolverAddr => resolveMx(resolverAddr, domain))
      .then((resolvedMailContractAddr) => {
        const resolvedMailContract = web3.eth.contract(config.mailContractAbi)
          .at(resolvedMailContractAddr);
        resolve(resolvedMailContract);
      })
      .catch(err => reject(err));
  });

const resolveUser = (email, domain, isExternalMail) => {
  if (!isExternalMail) {
    return _getPublicKey(email);
  }

  return getMailContract(domain)
    .then((resolvedMailContract) => {
      if (resolvedMailContract === config.mailContractAddress) {
        return _getPublicKey(email);
      }

      return _getPublicKey(email, resolvedMailContract);
    })
    .catch(error => Promise.reject({ error }));
};

export default {
  createWallet,
  signString,
  listenForMails,
  listenUserRegistered,
  _registerUser,
  _getPublicKey,
  _sendEmail,
  checkRegistration,
  checkMailAddress,
  signIn,
  getMails,
  getThread,
  getBalance,
  fetchAllEvents,
  resolveUser,
  getAddressInfo,
  updateContactsEvent,
  getContactsForUser,
};
