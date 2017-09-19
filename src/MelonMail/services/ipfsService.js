const IPFS = require('ipfs');
const concat = require('concat-stream');

const getMultiaddressString = node =>
  `/${node.connectionType}/${node.host}/tcp/${node.wsPort}/ws/ipfs/${node.id}`;

const getGatewayAddressString = node =>
  `${node.protocol}${node.host}:${node.gatewayPort}`;

const getUserRepNodes = () => (
  localStorage.getItem('customNodes') !== null ?
    [...JSON.parse(localStorage.getItem('customNodes'))] : []
);

const ipfsBootstrapNodesList = [
  '/ip4/127.0.0.1/tcp/9999/ws/ipfs/QmWc6qiH7rp7i8J2RcKvWgaw9daTW5LipfaBWbNkSuLTuU',
  ...getUserRepNodes().map(getMultiaddressString),
];

const defaultRepNodes = [
  'http://127.0.0.1:8080',
];

const ipfsNode = new IPFS({
  repo: 'ipfs-melon',
  config: {
    Bootstrap: ipfsBootstrapNodesList,
  },
});

const replicate = (hash, type) => {
  console.log(`Replicating ${type} with hash: ${hash}`);
  console.log(ipfsNode.bootstrap.list((err, info) => {
    console.log(err);
    console.log(info);
  }));
  let successful = 0;
  const replicationNodes = [
    ...defaultRepNodes,
    ...getUserRepNodes().map(getGatewayAddressString),
  ];
  console.log(replicationNodes);
  const replicationPromises = replicationNodes.map(node =>
    new Promise((resolve) => {
      const url = `${node}${type === 'file' ?
        '/api/v0/get?arg=' : '/api/v0/object/get?arg='}${hash}`;
      return fetch(url, { method: 'get' })
        .then(() => {
          successful += 1;
          resolve();
        })
        .catch((error) => {
          console.log(error);
          resolve();
        });
    }),
  );
  Promise.all(replicationPromises)
    .then(() => console.log(`Successfully replicated ${type} with hash: ${hash} on ${successful}/${replicationNodes.length} nodes`));
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

const addCustomNode = (node) => {
  const nodes = JSON.parse(localStorage.getItem('customNodes')) || [];
  nodes.push(node);
  localStorage.setItem('customNodes', JSON.stringify(nodes));
  ipfsNode.bootstrap.add(getMultiaddressString(node), (err, info) => {
    console.log(err);
    console.log(info);
  });
};

export default {
  uploadData,
  newThread,
  replyToThread,
  getThread,
  getFile,
  getFileStream,
  getFileContent,
  replicate,
  addCustomNode,
};
