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
/* eslint-disable no-loop-func, consistent-return */
export const encryptAttachments = (files, keys) =>
  new Promise((resolve, reject) => {
    if (files.length === 0) {
      return resolve([]);
    }
    const attachments = [];
    let reader = null;
    let attachment = '';

    for (let i = 0; i < files.length; i += 1) {
      reader = new FileReader();
      reader.fileName = files[i].name;

      reader.onload = (e) => {
        attachment = JSON.stringify({
          fileName: e.target.fileName,
          fileData: e.target.result,
        });

        attachments.push(encrypt(keys, attachment));

        if (attachments.length === files.length) {
          return resolve(attachments);
        }
      };
    }
  });
/* eslint-enable no-loop-func, consistent-return */
