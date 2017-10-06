import uniqBy from 'lodash/uniqBy';
import Web3 from 'web3';
import ENS from 'ethjs-ens';
import config from './config.json';
import { generateKeys, encrypt, decrypt } from './cryptoService';
import { executeWhenReady, namehash } from './helperService';

const ENS_MX_INTERFACE_ID = '0x59d1d43c';

let mailContract;

executeWhenReady(() => {
  try {
    window.web3 = new Web3(web3.currentProvider);
    web3.eth.getAccounts()
      .then((accounts) => {
        mailContract = new web3.eth.Contract(config.abi, config.contractAddress, {
          from: accounts[0],
        });
      });
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

    return web3.eth.net.getNetworkType((err, network) => {
      if (network.toString() !== config.network) {
        return reject({
          message: 'WRONG_NETWORK',
        });
      }

      return resolve();
    });
  });

const getBalance = () =>
  new Promise((resolve, reject) => {
    web3.eth.getAccounts()
      .then((accounts) => {
        if (accounts.length === 0) {
          return reject({
            message: 'Account not found.',
          });
        }

        return web3.eth.getBalance(accounts[0]);
      })
      .then((balance) => {
        resolve(parseFloat(web3.utils.fromWei(balance)));
      })
      .catch((error) => {
        reject({
          message: error,
        });
      });
  });

const getAccount = () =>
  new Promise((resolve, reject) => {
    web3.eth.getAccounts()
      .then((accounts) => {
        if (accounts.length === 0) {
          return reject({
            message: 'Account not found.',
          });
        }
        return resolve(accounts[0]);
      });
  });

const checkRegistration = () =>
  new Promise((resolve, reject) => {
    web3.eth.getAccounts()
      .then((accounts) => {
        if (accounts.length === 0) {
          return reject({
            error: true,
            message: 'Account not found.',
          });
        }

        const options = {
          filter: {
            addr: accounts[0],
          },
          fromBlock: 0,
          toBlock: 'latest',
        };
        return mailContract.getPastEvents('UserRegistered', options)
          .then((events) => {
            if (!events.length) {
              return reject({
                error: false,
                notRegistered: true,
                message: 'User not registered.',
              });
            }
            return resolve({
              mail: events[0].returnValues.encryptedUsername,
              address: events[0].returnValues.addr,
              startingBlock: events[0].blockNumber,
            });
          })
          .catch((error) => {
            reject({
              error: true,
              message: error,
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
    web3.eth.personal.sign(web3.utils.fromUtf8(stringToSign), account, (error, result) => {
      if (error) {
        return reject(error);
      }
      return resolve(result);
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
    const options = {
      filter: {
        usernameHash: web3.utils.sha3(email),
      },
      fromBlock: 0,
      toBlock: 'latest',
    };
    mailContract.getPastEvents('UserRegistered', options)
      .then((events) => {
        if (events.length > 0) {
          return reject({
            message: 'Username is already taken.',
          });
        }

        return resolve({
          message: 'Username is available.',
        });
      })
      .catch((error) => {
        reject({
          message: error,
          events: null,
        });
      });
  });

/* Calls registerUser function from the contract code */

const _registerUser = (mailAddress, signedString) =>
  new Promise((resolve, reject) => {
    const { privateKey, publicKey } = generateKeys(signedString);

    web3.eth.getAccounts()
      .then((accounts) => {
        if (accounts.length === 0) {
          return reject({
            message: 'Account not found.',
          });
        }
        return mailContract.methods.registerUser(
          web3.utils.sha3(mailAddress),
          encrypt({ privateKey, publicKey }, mailAddress),
          publicKey,
        )
          .send((error) => {
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
                  address: accounts[0],
                  startingBlock,
                });
              })
              .catch(() => {
                resolve({
                  publicKey,
                  privateKey,
                  mailAddress,
                  address: accounts[0],
                  startingBlock: 0,
                });
              });
          });
      });
  });

/* Scans the blockchain to find the public key for a user */
/* TODO: Should be expanded or wrapped to include fetching keys for users on other domains */

const _getPublicKey = (email, optionalContract) =>
  new Promise((resolve, reject) => {
    const contract = optionalContract !== undefined ? optionalContract : mailContract;
    const options = {
      filter: {
        usernameHash: web3.utils.sha3(email),
      },
      fromBlock: 0,
      toBlock: 'latest',
    };
    contract.getPastEvents('UserRegistered', options)
      .then((events) => {
        if (!events.length) {
          return reject({
            message: 'User not found!',
            events,
          });
        }

        console.log(events[0]);

        return resolve({
          isExternal: optionalContract !== undefined,
          address: events[0].returnValues.addr,
          publicKey: events[0].returnValues.publicKey,
        });
      })
      .catch((error) => {
        reject({
          message: error,
          events: null,
        });
      });
  });

/* Subscribes to the mail send event */

const listenForMails = callback =>
  web3.eth.getAccounts()
    .then((accounts) => {
      if (accounts.length === 0) {
        return null;
      }
      return getBlockNumber()
        .then((startingBlock) => {
          mailContract.events.EmailSent({
            filter: {
              to: accounts[0],
            },
            fromBlock: startingBlock,
            toBlock: 'latest',
          }, (event) => {
            console.log(event);
            callback(event, 'inbox');
          })
            .on('data', (event) => {
              callback(event, 'inbox');
            })
            .on('error', error => console.log(error));

          mailContract.events.EmailSent({
            filter: {
              from: accounts[0],
            },
            fromBlock: startingBlock,
            toBlock: 'latest',
          }, (event) => {
            callback(event, 'outbox');
          })
            .on('data', (event) => {
              console.log('Mail event: Received an email', event);
              callback(event, 'outbox');
            });
        });
    });

const getMails = (folder, fetchToBlock, blocksToFetch) =>
  new Promise((resolve, reject) => {
    console.log(`Fetching emails with batch size of ${blocksToFetch} blocks`);
    web3.eth.getAccounts()
      .then((accounts) => {
        if (accounts.length === 0) {
          return reject({
            message: 'Account not found.',
          });
        }
        return getBlockNumber()
          .then((currentBlock) => {
            const filter = folder === 'inbox' ? { to: accounts[0] } : { from: accounts[0] };
            const fetchTo = fetchToBlock === null ? currentBlock : fetchToBlock;
            mailContract.getPastEvents('EmailSent', {
              filter,
              fromBlock: fetchTo - blocksToFetch,
              toBlock: fetchTo,
            })
              .then((events) => {
                const filteredEvents = uniqBy(events.reverse(), 'returnValues.threadId');
                return resolve({
                  mailEvents: filteredEvents,
                  fromBlock: fetchTo - blocksToFetch,
                });
              })
              .catch((error) => {
                reject({
                  message: error,
                });
              });
          });
      });
  });

const getThread = (threadId, afterBlock) =>
  new Promise((resolve, reject) => {
    mailContract.getPastEvents('EmailSent',
      {
        filter: {
          threadId,
        },
        fromBlock: afterBlock,
        toBlock: 'latest',
      })
      .then((events) => {
        resolve(events.pop());
      })
      .catch((error) => {
        reject({
          message: error,
        });
      });
  });

const _sendEmail = (toAddress, mailHash, threadHash, threadId) =>
  new Promise((resolve, reject) => {
    mailContract.methods.sendEmail(toAddress, mailHash, threadHash, threadId)
      .send((error, result) => {
        if (error) {
          return reject({
            message: error,
          });
        }

        return resolve(result);
      });
  });

const signIn = mail => new Promise((resolve, reject) => {
  web3.eth.getAccounts()
    .then((accounts) => {
      if (accounts.length === 0) {
        return reject({
          message: 'Account not found.',
        });
      }
      return signString(accounts[0], config.stringToSign)
        .then((signedString) => {
          const { privateKey, publicKey } = generateKeys(signedString);
          resolve({
            status: true,
            privateKey,
            publicKey,
            mail: decrypt({ privateKey, publicKey }, mail),
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
    web3.eth.getAccounts()
      .then((accounts) => {
        if (accounts.length === 0) {
          return reject({
            message: 'Account not found.',
          });
        }
        const filter = folder === 'inbox' ? { to: accounts[0] } : { from: accounts[0] };
        return mailContract.getPastEvents('EmailSent', {
          filter,
          fromBlock: 0,
          toBlock: 'latest',
        })
          .then((events) => {
            const filteredEvents = uniqBy(events, folder === 'inbox' ? 'returnValues.from' : 'returnValues.to');
            return resolve(filteredEvents);
          })
          .catch((error) => {
            reject({
              message: error,
            });
          });
      });
  });

const getAddressInfo = address =>
  new Promise((resolve) => {
    const options = {
      filter: {
        addr: address,
      },
      fromBlock: 0,
      toBlock: 'latest',
    };
    mailContract.getPastEvents('UserRegistered', options)
      .then((events) => {
        resolve(events);
      })
      .catch((error) => {
        console.log(error);
      });
  });

const updateContactsEvent = (hashName, ipfsHash) =>
  new Promise((resolve, reject) => {
    mailContract.methods.updateContacts(hashName, ipfsHash)
      .send((err, resp) => {
        if (err) {
          reject(err);
        }

        return resolve(resp);
      });
  });

const getContactsForUser = userHash =>
  new Promise((resolve, reject) => {
    mailContract.getPastEvents('ContactsUpdated', {
      filter: {
        usernameHash: userHash,
      },
      fromBlock: 0,
      toBlock: 'latest',
    })
      .then((events) => {
        console.log(events);
        if (events.length > 0) {
          resolve(events.pop());
        } else {
          resolve(null);
        }
      })
      .catch((err) => {
        reject(err);
      });
  });

const getResolverForDomain = domain =>
  new Promise((resolve, reject) => {
    const ens = new ENS({ provider: web3.currentProvider, network: '3' });
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
    web3.eth.getAccounts()
      .then((accounts) => {
        const mxResolverContract = new web3.eth.Contract(config.mxResolverAbi, resolverAddr, {
          from: accounts[0],
        });
        mxResolverContract.methods.supportsInterface(ENS_MX_INTERFACE_ID)
          .call((err, res) => {
            if (err) reject(err);
            if (!res) reject(false);

            mxResolverContract.methods.MX(namehash(domain))
              .call((errMx, mailContractAddr) => {
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
        web3.eth.getAccounts()
          .then((accounts) => {
            const resolvedMailContract = new web3.eth.Contract(
              config.abi,
              resolvedMailContractAddr, {
                from: accounts[0],
              });
            resolve(resolvedMailContract);
          });
      })
      .catch(err => reject(err));
  });

const resolveUser = (email, domain, isExternalMail) => {
  if (!isExternalMail) {
    return _getPublicKey(email);
  }

  return getMailContract(domain)
    .then(resolvedMailContract => _getPublicKey(email, resolvedMailContract));
};

export default {
  getWeb3Status,
  signString,
  getAccount,
  listenForMails,
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
