import { utils } from 'ethers';
import human from 'human-time';

export const executeWhenReady = (f) => {
  if (document.readyState === 'complete') {
    f();
  } else {
    window.addEventListener('load', () => { f(); });
  }
};

export const keccak256 = data => utils.keccak256(utils.toUtf8Bytes(data));

export const formatDate = (inputDate) => {
  if (isNaN(inputDate)) return '';
  const date = new Date(inputDate);

  return `${date.getDate()}. ${date.getMonth() + 1}. ${date.getFullYear()}. 
    ${`0${date.getHours()}`.slice(-2)}:${`0${date.getMinutes()}`.slice(-2)}`;
};

export const humanizeDate = (inputDate) => {
  if (isNaN(inputDate)) return '';
  const date = new Date(inputDate);
  return (Date.now() - date > 7 * 24 * 60 * 60 * 1000) ?
    formatDate(inputDate).slice(0, -12) : human(date);
};

export const namehash = (name) => {
  let node = '0x0000000000000000000000000000000000000000000000000000000000000000';
  if (name !== '') {
    const labels = name.split('.');
    for (let i = labels.length - 1; i >= 0; i -= 1) {
      node = keccak256(node + keccak256(labels[i]).slice(2), { encoding: 'hex' });
    }
  }
  return node.toString();
};

export const welcomeEmailUnencrypted = username => ({
  from: username,
  to: [username],
  subject: 'Welcome to Melon Mail',
  body: '<h1>Welcome</h1><p>To get started try sending an email!</p>',
  time: '',
  attachments: [],
  threadId: 'welcome',
  transactionHash: '',
  mailHash: '',
  threadHash: '',
  hash: 'welcome',
});

export const toHex = (str) => {
  const arr1 = [];
  for (let n = 0, l = str.length; n < l; n += 1) {
    const hex = Number(str.charCodeAt(n)).toString(16);
    arr1.push(hex);
  }
  return arr1.join('');
};

export const padZeros = (data, type) => {
  let value = data;
  switch (type) {
    case 'address':
    case 'bytes32':
      value = data;
      break;
    case 'string':
      value = `0x${toHex(data)}`;
      break;
    default:
      value = data;
      break;
  }

  return utils.hexlify(utils.padZeros(value, 32));
};

export const createFilter = (filter, event) =>
  event.inputs.filter(item => item.indexed).map((item) => {
    const data = filter[item.name];
    if (data === undefined) return null;
    return Object.prototype.hasOwnProperty.call(filter, item.name) ?
      padZeros(data, item.type) : null;
  });
