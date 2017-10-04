import uniqBy from 'lodash/uniqBy';
import Web3 from 'web3';
import config from './config.json';
import { generateKeys } from './cryptoService';
import { executeWhenReady } from './helperService';

let mailContract;

executeWhenReady(() => {
  try {
    window.web3 = new Web3(web3.currentProvider);
    web3.eth.getAccounts()
      .then((accounts) => {
        console.log(mailContract);
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
        return mailContract.getPastEvents('BroadcastPublicKey', options);
      })
      .then((events) => {
        if (!events.length) {
          return reject({
            error: false,
            notRegistered: true,
            message: 'User not registered.',
          });
        }
        console.log(events);

        return resolve({
          mail: web3.utils.toAscii(events[0].returnValues.username),
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
        username: web3.utils.fromAscii(email),
      },
      fromBlock: 0,
      toBlock: 'latest',
    };
    mailContract.getPastEvents('BroadcastPublicKey', options)
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

const _registerUser = (mailAddress, signedString, mailHash, threadHash) =>
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
          web3.utils.fromAscii(mailAddress), publicKey, mailHash, threadHash)
          .send((error, result) => {
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

const _getPublicKey = email =>
  new Promise((resolve, reject) => {
    const options = {
      filter: {
        username: web3.utils.fromAscii(email),
      },
      fromBlock: 0,
      toBlock: 'latest',
    };
    mailContract.getPastEvents('BroadcastPublicKey', options)
      .then((events) => {
        if (!events.length) {
          return reject({
            message: 'User not found!',
            events,
          });
        }

        return resolve({
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
          mailContract.events.SendEmail({
            filter: {
              to: accounts[0],
            },
            fromBlock: startingBlock,
            toBlock: 'latest',
          })
            .on('data', (event) => {
              callback(event, 'inbox');
            })
            .on('error', error => console.log(error));

          mailContract.events.SendEmail({
            filter: {
              from: accounts[0],
            },
            fromBlock: startingBlock,
            toBlock: 'latest',
          })
            .on('data', (event) => {
              console.log('Mail event: Received an email', event);
              callback(event, 'outbox');
            })
            .on('error', error => console.log(error));
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
            mailContract.getPastEvents('SendEmail', {
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
    mailContract.getPastEvents('SendEmail',
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

const signIn = () => new Promise((resolve, reject) => {
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
        return mailContract.getPastEvents('SendEmail', {
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
    mailContract.getPastEvents('BroadcastPublicKey', options)
      .then((events) => {
        resolve(events);
      })
      .catch((error) => {
        console.log(error);
      });
  });

const updateContactsEvent = (hashName, ipfsHash) =>
  new Promise((resolve, reject) => {
    const account = getAccount();
    mailContract.updateContacts.sendTransaction(hashName, ipfsHash, { from: account },
      (err, resp) => {
        if (err) {
          reject(err);
        }

        console.log('Event sent!!!! ', resp);
        resolve(resp);
      });
  });

const getContactsForUser = userHash =>
  new Promise((resolve) => {
    mailContract.UpdateContacts(
      {
        usernameHash: userHash,
      },
      {
        fromBlock: 0,
        toBlock: 'latest',
      },
    ).get((error, events) => {
      console.log('In events listener event', error, events);
      if (events.length > 0) {
        resolve(events.pop());
      } else {
        resolve(null);
      }
    });
  });

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
  getAddressInfo,
  updateContactsEvent,
  getContactsForUser,
};
