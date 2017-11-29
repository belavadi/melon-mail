import Web3 from 'web3';
import uniqBy from 'lodash/uniqBy';
import ENS from 'ethjs-ens';
import config from '../../config/config.json';
import { generateKeys, encrypt, decrypt } from './cryptoService';
import { executeWhenReady, namehash } from './helperService';

const ENS_MX_INTERFACE_ID = '0x7d753cf6';

let mailContract;
let eventContract;

const networks = {
  3: 'ropsten',
  42: 'kovan',
  4: 'rinkeby',
  2: 'morden',
  1: 'mainnet',
};

executeWhenReady(() => {
  try {
    window.web3 = new Web3(web3.currentProvider);

    mailContract = web3.eth.contract(config.mailContractAbi)
      .at(config.mailContractAddress);

    let url = 'https://kovan.decenter.com';
    const customNode = localStorage.getItem('customEthNode');

    if (customNode) {
      url = JSON.parse(customNode).protocol + JSON.parse(customNode).ipAddress;
    }

    const web3Custom = new Web3(new web3.providers.HttpProvider(url));

    eventContract = web3Custom.eth.contract(config.mailContractAbi)
      .at(config.mailContractAddress);
  } catch (e) {
    console.log(e);
  }
});

const getWeb3Status = () =>
  new Promise((resolve, reject) => {
    if (!web3) {
      return reject({
        message: 'NOT_FOUND',
      });
    }

    return web3.version.getNetwork((err, networkId) => {
      if (networks[networkId] !== config.network && !config.testContract) {
        return reject({
          message: 'WRONG_NETWORK',
        });
      }

      return resolve();
    });
  });

const getNetwork = () =>
  new Promise((resolve, reject) => {
    web3.version.getNetwork((err, networkId) => {
      if (err) {
        return reject({
          message: err,
        });
      }

      return resolve(networks[networkId]);
    });
  });

const getAccount = () =>
  new Promise((resolve, reject) => {
    web3.eth.getAccounts((err, accounts) => {
      if (err) {
        return reject({
          message: err,
        });
      }
      if (accounts.length === 0) {
        return reject({
          message: 'Account not found.',
        });
      }
      return resolve(accounts[0]);
    });
  });

const getBalance = () => new Promise((resolve, reject) => {
  getAccount()
    .then((account) => {
      web3.eth.getBalance(account, (error, balance) => {
        if (error) {
          return reject({
            message: error,
          });
        }

        return resolve(parseFloat(web3.fromWei(balance)));
      });
    });
});

const checkRegistration = () =>
  new Promise((resolve, reject) => {
    getAccount().then((account) => {
      if (!account) {
        return reject({
          error: true,
          message: 'Account not found.',
        });
      }

      return eventContract.UserRegistered(
        {
          addr: account,
        },
        {
          fromBlock: 0,
          toBlock: 'latest',
        })
        .get((err, events) => {
          if (err) {
            reject({
              error: true,
              message: err,
            });
          }

          if (!events.length) {
            return reject({
              error: false,
              notRegistered: true,
              message: 'User not registered.',
            });
          }
          return resolve({
            mailAddress: events[0].args.encryptedUsername,
            address: events[0].args.addr,
            startingBlock: events[0].blockNumber,
          });
        });
    })
      .catch((error) => {
        reject({
          error: true,
          message: error,
        });
      });
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

const getBlockNumber = () =>
  new Promise((resolve, reject) => {
    web3.eth.getBlockNumber((error, latestBlock) => {
      if (error) {
        return reject(error);
      }

      return resolve(latestBlock);
    });
  });

const checkMailAddress = email =>
  new Promise((resolve, reject) => {
    eventContract.UserRegistered(
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

        if (events.length > 0) {
          return reject({
            message: 'Username is already taken.',
          });
        }

        return resolve({
          message: 'Username is available.',
        });
      });
  });

/* Calls registerUser function from the contract code */

const _registerUser = (mailAddress, signedString) =>
  new Promise((resolve, reject) => {
    const { privateKey, publicKey } = generateKeys(signedString);

    getAccount()
      .then((account) => {
        if (!account) {
          return reject({
            message: 'Account not found.',
          });
        }

        return mailContract.registerUser(
          web3.sha3(mailAddress),
          encrypt({ privateKey, publicKey }, mailAddress),
          publicKey,
          { from: account },
          (error) => {
            if (error) {
              return reject({
                message: error,
              });
            }

            return getBlockNumber()
              .then((startingBlock) => {
                resolve({
                  publicKey,
                  privateKey,
                  mailAddress,
                  address: account,
                  startingBlock,
                });
              })
              .catch(() => {
                resolve({
                  publicKey,
                  privateKey,
                  mailAddress,
                  address: account,
                  startingBlock: 0,
                });
              });
          });
      });
  });

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
  getWeb3Status,
  signString,
  getAccount,
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
  getNetwork,
};
