// const bitcore = require('bitcore-lib');
// const ecies = require('bitcore-ecies');
//
// const PublicEmail = artifacts.require("./PublicEmail.sol");
// const Random = bitcore.crypto.Random;
//
// function generateKeys() {
//   const privateKey = bitcore.PrivateKey.fromString('b221d9dbb083a7f33428d7c2a3c3198ae925614d70210e28716ccaa7cd4ddb79');
//   const publicKey = bitcore.PublicKey.fromPrivateKey(privateKey);
//
//   return {
//     privateKey: privateKey.toString(),
//     publicKey: publicKey.toString(),
//   };
// }
//
// function encrypt(keys, data) {
//   const privateKey = new bitcore.PrivateKey(keys.privateKey);
//   const receiver = ecies().privateKey(privateKey).publicKey(new bitcore.PublicKey(keys.publicKey));
//
//   return receiver.encrypt(data, Random.getRandomBuffer(16)).toString('hex');
// };
//
// module.exports.generateKeys = generateKeys;
// module.exports.encrypt = encrypt;