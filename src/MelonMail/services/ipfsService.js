const IPFS = require('ipfs');
const concat = require('concat-stream');

const ipfsNodesList = [
  '/ip4/127.0.0.1/tcp/9999/ws/ipfs/QmWc6qiH7rp7i8J2RcKvWgaw9daTW5LipfaBWbNkSuLTuU',
  '/ip4/46.101.79.241/tcp/9999/ws/ipfs/QmNxpsbNJzvXpUbv9Kp9YnNAdgSzNz8DGWay8ie7pyLy5q',
];

const ipfsNode = new IPFS({
  repo: 'ipfs-melon',
  config: {
    Bootstrap: ipfsNodesList,
  },
});

const uploadData = (data) => {
  const preparedData = new Buffer(JSON.stringify(data));

  return ipfsNode.files.add(preparedData);
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

  return ipfsNode.object.put(thread);
};

const replyToThread = (reply, threadHash) =>
  ipfsNode.object.get(threadHash)
    .then((thread) => {
      const parsedThread = thread.toJSON();
      const replyLink = {
        ...reply,
        multihash: reply.hash,
        name: parsedThread.links.length.toString(),
      };
      return ipfsNode.object.patch.addLink(threadHash, replyLink);
    });

const getThread = hash => ipfsNode.object.get(hash);

const getFile = hash => ipfsNode.files.get(hash);

const getFileStream = hash => ipfsNode.files.cat(hash);

const getFileContent = hash =>
  new Promise((resolve, reject) => {
    ipfsNode.files.cat(hash)
      .then(file => file.pipe(concat(data => resolve(new TextDecoder('utf-8').decode(data)))))
      .catch(err => reject(err));
  });

const uploadToIpfs = data =>
  new Promise((resolve, reject) => {
    uploadData(data)
      .then((mailLink) => {
        const mailObject = mailLink.length ? mailLink[0] : mailLink;

        newThread(mailObject)
          .then((threadLink) => {
            const multihash = threadLink.toJSON().multihash;
            return resolve({
              mailHash: mailObject.hash,
              threadHash: multihash,
            });
          });
      })
      .catch(err => reject(err));
  });

export default {
  uploadData,
  newThread,
  replyToThread,
  getThread,
  getFile,
  getFileStream,
  getFileContent,
  uploadToIpfs,
};
