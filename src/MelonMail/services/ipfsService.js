const IPFS = require('ipfs');
const ipfsAPI = require('ipfs-api');
const concat = require('concat-stream');

const ipfsBootstrapNodesList = [
  '/ip4/127.0.0.1/tcp/9999/ws/ipfs/QmWc6qiH7rp7i8J2RcKvWgaw9daTW5LipfaBWbNkSuLTuU',
  '/ip4/46.101.79.241/tcp/9999/ws/ipfs/QmNxpsbNJzvXpUbv9Kp9YnNAdgSzNz8DGWay8ie7pyLy5q',
];

const ipfsNodesList = [
  ['/ip4/127.0.0.1/tcp/5001'],
  ['ipfs.decenter.com', '443', { protocol: 'https' }],
];

const ipfsNode = new IPFS({
  repo: 'ipfs-melon',
  config: {
    Bootstrap: ipfsBootstrapNodesList,
  },
});

const replicate = (hash, type) => {
  console.log(`Replicating ${type} with hash: ${hash}`);
  let successful = 0;
  const replicationPromises = ipfsNodesList.map(node =>
    new Promise((resolve) => {
      const api = ipfsAPI(...node);
      return (type === 'file' ? api.files.get(hash) : api.object.get(hash))
        .then(() => {
          successful += 1;
          resolve();
        })
        .catch(() => resolve());
    }),
  );
  Promise.all(replicationPromises)
    .then(() => console.log(`Successfully replicated ${type} with hash: ${hash} on ${successful}/${ipfsNodesList.length} nodes`));
};

const uploadData = data =>
  new Promise((resolve, reject) => {
    const preparedData = new Buffer(JSON.stringify(data));

    return ipfsNode.files.add(preparedData)
      .then((res) => {
        replicate(res[0].hash, 'file');
        resolve(res);
      })
      .catch(err => reject(err));
  });

const newThread = mail =>
  new Promise((resolve, reject) => {
    if (!mail.hash || !mail.size) {
      resolve(false);
    }

    const thread = {
      Data: new Buffer(''),
      Links: [{
        ...mail,
        name: '0',
      }],
    };

    return ipfsNode.object.put(thread)
      .then((res) => {
        replicate(res.toJSON().multihash, 'object');
        resolve(res);
      })
      .catch(err => reject(err));
  });

const replyToThread = (reply, threadHash) =>
  new Promise((resolve, reject) =>
    ipfsNode.object.get(threadHash)
      .then((thread) => {
        const parsedThread = thread.toJSON();
        const replyLink = {
          name: `${parsedThread.links.length}`,
          size: reply.size,
          multihash: reply.hash,
        };
        return ipfsNode.object.patch.addLink(thread.toJSON().multihash, replyLink)
          .then((res) => {
            replicate(res.toJSON().multihash, 'object');
            resolve(res);
          })
          .catch(err => reject(err));
      }),
  );

const getThread = hash => ipfsNode.object.get(hash);

const getFile = hash => ipfsNode.files.get(hash);

const getFileStream = hash => ipfsNode.files.cat(hash);

const getFileContent = hash =>
  new Promise((resolve, reject) => {
    ipfsNode.files.cat(hash)
      .then(file => file.pipe(concat(data => resolve(new TextDecoder('utf-8').decode(data)))))
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
  replicate,
};
