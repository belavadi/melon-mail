import bitcore from 'bitcore-lib';

import contract from './contract.json';

const NETWORK_ID = '42';
const mailContract = web3.eth.contract(contract.abi).at(contract.contractAddress);

const getWeb3Status = () =>
  new Promise((resolve, reject) => {
    if (!web3) {
      return reject({
        message: 'NOT_FOUND',
      });
    }

    return web3.version.getNetwork((err, netId) => {
      if (netId.toString() !== NETWORK_ID) {
        return reject({
          message: 'WRONG_NETWORK',
        });
      }

      return resolve();
    });
  });

const getAccount = () => {
  // TODO: check diff between defaultAccount & accounts[0]
  if (!web3.eth.accounts || !web3.eth.accounts.length) { return false; }

  return web3.eth.accounts[0];
};

const checkRegistration = () =>
  new Promise((resolve, reject) => {
    const account = getAccount();
    if (!account) {
      return reject({
        message: 'NO_ACCOUNT',
      });
    }

    // TODO
    // look for events on chain
    return resolve(true);
  });

const signString = (account, stringToSign) =>
  new Promise((resolve, reject) => {
    web3.eth.sign(account, stringToSign, (error, result) => {
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

/* Calls registerUser function from the contract code */

const registerUserContract = (email, privateKey, publicKey) =>
  new Promise((resolve, reject) => {
    mailContract.registerUser(email, publicKey.toString(), (error, result) => {
      if (error) {
        return reject(error);
      }

      return getBlockNumber()
        .then((startingBlock) => {
          resolve({
            email,
            privateKey,
            startingBlock,
          });
        })
        .catch(() => {
          resolve({
            email,
            privateKey,
            startingBlock: 0,
          });
        });
    });
  });

/* Scans the blockchain to find the public key for a user */

const getPublicKeyContract = email =>
  new Promise((resolve, reject) => {
    mailContract.BroadcastPublicKey(
      {
        username: web3.fromAscii(email),
      },
      {
        fromBlock: 0,
        toBlock: 'latest',
      })
      .get((error, events) => {
        if (!events.length || error) {
          return reject(error);
        }

        return resolve({
          address: events[0].args.addr,
          publicKey: events[0].args.publicKey,
        });
      });
  });

/* Subscribes to the mail send event */

const incomingMailEvent = startBlock =>
  new Promise((resolve, reject) => {
    mailContract.SendEmail(
      {
        to: getAccount(),
      },
      {
        fromBlock: startBlock,
        toBlock: 'latest',
      })
      .watch((error, event) => {
        if (error) {
          return reject(error);
        }
        console.log(`Mail event: Received an email${JSON.stringify(event)}`);
        return resolve(event);
      });
  });

const sendEmailContract = (toAddress, ipfsHash, threadId) =>
  new Promise((resolve, reject) => {
    mailContract.sendEmail(toAddress, ipfsHash, threadId, (error, result) => {
      if (error) {
        return reject(error);
      }

      return resolve(result);
    });
  });

const signIn = () => new Promise((resolve, reject) => {
  const acc = getAccount();
  signString
    .then((result) => {
      resolve({
        status: true,
      });
    })
    .catch((error) => {
      reject(error);
    });
});

export default {
  getWeb3Status,
  getAccount,
  incomingMailEvent,
  registerUserContract,
  getPublicKeyContract,
  checkRegistration,
  signIn,
};
