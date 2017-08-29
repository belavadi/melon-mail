import bitcore from 'bitcore-lib';
import ecies from 'bitcore-ecies';

export const generateKeys = (data) => {
  const privateKey = bitcore.PrivateKey.fromString(data.slice(2, 66));
  const publicKey = bitcore.PublicKey.fromPrivateKey(privateKey);

  return {
    privateKey: privateKey.toString(),
    publicKey: publicKey.toString(),
  };
};

export const encrypt = (keys, data) => {
  const privateKey = new bitcore.PrivateKey(keys.privateKey);
  const receiver = ecies().privateKey(privateKey).publicKey(new bitcore.PublicKey(keys.publicKey));

  return receiver.encrypt(data).toString('hex');
};

export const decrypt = (keys, data) => {
  const privateKey = ecies().privateKey(new bitcore.PrivateKey(keys.privateKey));

  return privateKey.decrypt(new Buffer(data, 'hex')).toString('ascii');
};
