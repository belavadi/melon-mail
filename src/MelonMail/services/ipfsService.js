const ipfsAPI = require('ipfs-api');

let ipfsNode;

const ipfs = () => {
  if (!ipfsNode) {
    console.log('IPFS init');
    ipfsNode = ipfsAPI();
  }
  return ipfsNode;
};

const uploadMail = (mail) => {
  if (!mail.to) {
    return false;
  }
  const preparedMail = new Buffer(JSON.stringify(mail));

  return ipfs().files.add(preparedMail);
};

const newThread = (mail) => {
  if (!mail.hash || !mail.size) {
    return false;
  }

  const thread = {
    Data: new Buffer(''),
    Links: [{
      ...mail,
      name: '0',
    }],
  };

  return ipfs().object.put(thread);
};

const getThread = hash => ipfs().object.get(hash);

const getFile = hash => ipfs().file.get(hash);

const getFileStream = hash => ipfs().file.cat(hash);

export default {
  uploadMail,
  newThread,
};
