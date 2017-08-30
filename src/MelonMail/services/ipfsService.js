const ipfsAPI = require('ipfs-api');
const concat = require('concat-stream');

let ipfsNode;

const ipfs = () => {
  if (!ipfsNode) {
    ipfsNode = ipfsAPI();
  }
  return ipfsNode;
};

const uploadMail = (mail) => {
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

const getFile = hash => ipfs().files.get(hash);

const getFileStream = hash => ipfs().files.cat(hash);

const getFileContent = hash =>
  new Promise((resolve, reject) => {
    ipfs().files.cat(hash)
      .then(file => file.pipe(concat(data => resolve(new TextDecoder('utf-8').decode(data)))));
  });

export default {
  uploadMail,
  newThread,
  getThread,
  getFile,
  getFileStream,
  getFileContent,
};
