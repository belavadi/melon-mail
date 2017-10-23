import bitcore from 'bitcore-lib';
import ecies from 'bitcore-ecies';
import ipfs from './ipfsService';

const Random = bitcore.crypto.Random;

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

  return receiver.encrypt(data, Random.getRandomBuffer(16)).toString('hex');
};

export const decrypt = (keys, data) => {
  const privateKey = ecies().privateKey(new bitcore.PrivateKey(keys.privateKey));

  return privateKey.decrypt(new Buffer(data, 'hex')).toString();
};

const encryptFile = (file, keys) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.fileName = file.name;
    reader.onload = (e) => {
      resolve({
        name: file.name,
        size: file.size,
        attachment: encrypt(keys, JSON.stringify({
          fileName: e.target.fileName,
          fileData: e.target.result,
        })),
      });
    };
    reader.onerror = err => reject(err);

    reader.readAsDataURL(file);
  });

export const encryptAttachments = (files, keys) =>
  new Promise((resolve, reject) => {
    if (files.length === 0) {
      return resolve([]);
    }
    const attachments = files.map(file => encryptFile(file, keys));

    return Promise.all(attachments)
      .then((encryptedAttachments) => {
        const uploaded = encryptedAttachments.map(attachment =>
          ipfs.uploadData(attachment.attachment),
        );
        Promise.all(uploaded)
          .then((ipfsObjects) => {
            const data = ipfsObjects.map((ipfsObject, i) => ({
              name: encryptedAttachments[i].name,
              size: encryptedAttachments[i].size,
              hash: ipfsObject.length ? ipfsObject[0].hash : ipfsObject,
            }));
            resolve(data);
          });
      })
      .catch((error) => {
        reject({
          message: 'Mail encryption / upload failed.',
          error,
        });
      });
  })
;
