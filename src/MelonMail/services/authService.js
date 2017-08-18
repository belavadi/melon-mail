import bitcore from 'bitcore-lib';

import eth from './ethereumService';
import contract from './contract.json';

const registerUser = username =>
  new Promise((resolve, reject) => {
    eth.signString(eth.getAccount(), contract.stringToSign)
      .then((result) => {
        const privateKey = bitcore.PrivateKey.fromString(result.slice(2, 66));
        const publicKey = bitcore.PublicKey.fromPrivateKey(privateKey);
        const email = `${username}@melonmail.eth`;

        return eth.registerUserContract(email, privateKey, publicKey);
      })
      .then((data) => {
        resolve(data);
      })
      .catch((error) => {
        reject(error);
      });
  });
