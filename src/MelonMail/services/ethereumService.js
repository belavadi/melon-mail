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

const signIn = () => new Promise((resolve, reject) => {
  const acc = getAccount();
  web3.eth.sign(acc, contract.stringToSign, (error, result) => {
    // TODO
    const status = !error;
    resolve({
      status, error,
    });
  });
});

export default {
  getWeb3Status,
  getAccount,
  checkRegistration,
  signIn,
};
