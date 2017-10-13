import findIndex from 'lodash/findIndex';

const concat = require('concat-stream');

const getMultiaddressString = node =>
  `/${node.connectionType}/${node.host}/tcp/${node.wsPort}/${node.protocol === 'https' ? 'wss' : 'wss'}/ipfs/${node.id}`;

const getGatewayAddressString = node =>
  `${node.protocol}${node.host}:${node.gatewayPort}`;

const getUserRepNodes = () => (
  localStorage.getItem('customNodes') !== null ?
    [...JSON.parse(localStorage.getItem('customNodes'))] : []
);

const ipfsBootstrapNodesList = [
  '/dns4/ipfs.decenter.com/tcp/4443/wss/ipfs/QmNxpsbNJzvXpUbv9Kp9YnNAdgSzNz8DGWay8ie7pyLy5q',
  ...getUserRepNodes().map(getMultiaddressString),
];

const defaultRepNodes = [
  'https://ipfs.decenter.com',
];

const ipfsNode = new Ipfs({
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
      return fetch(url, { method: 'head', mode: 'no-cors' })
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
    const ipfsTimeout = setTimeout(() => {
      reject({ error: 'Couldn\'t fetch email. (TIMEOUT)' });
    }, 15000);
    ipfsNode.files.cat(hash)
      .then((file) => {
        clearTimeout(ipfsTimeout);
        file.pipe(concat(data => resolve(new TextDecoder('utf-8').decode(data))));
      })
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

const addCustomNode = (node) => {
  const nodes = JSON.parse(localStorage.getItem('customNodes')) || [];
  if (findIndex(nodes, { host: node.host }) !== -1 ||
    findIndex(nodes, { id: node.id }) !== -1) return 'DUPLICATE_NODE';
  nodes.push(node);
  localStorage.setItem('customNodes', JSON.stringify(nodes));
  ipfsNode.swarm.connect(getMultiaddressString(node), (err, info) => {
    console.log(err);
    console.log(info);
  });
  return 'OK';
};

const removeCustomNode = (node) => {
  const nodes = JSON.parse(localStorage.getItem('customNodes')) || [];
  nodes.splice(findIndex(nodes, { host: node.host }), 1);
  console.log(nodes);
  localStorage.setItem('customNodes', JSON.stringify(nodes));
  ipfsNode.swarm.disconnect(getMultiaddressString(node), (err, info) => {
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
  removeCustomNode,
  uploadToIpfs,
};
