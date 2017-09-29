import { generateKeys, encrypt } from './cryptoService';

const human = require('human-time');

export const executeWhenReady = (f) => {
  if (document.readyState === 'complete') {
    f();
  } else {
    window.addEventListener('load', () => { f(); });
  }
};

export const formatDate = (inputDate) => {
  const date = new Date(inputDate);

  return `${date.getDate()}. ${date.getMonth() + 1}. ${date.getFullYear()}. 
    ${`0${date.getHours()}`.slice(-2)}:${`0${date.getMinutes()}`.slice(-2)}`;
};

export const humanizeDate = (inputDate) => {
  const date = new Date(inputDate);
  return (Date.now() - date > 7 * 24 * 60 * 60 * 1000) ?
    formatDate(inputDate).slice(0, -12) : human(date);
};

export const welcomeEmail = (to, username, signedString) => {
  const keys = generateKeys(signedString);
  const encryptedData = encrypt(keys, JSON.stringify({
    from: 'noreply@melonmail.eth',
    to: username,
    subject: 'Welcome to Melon Mail',
    body: '<h1>Welcome</h1><p>To get started try sending an email!</p>',
    time: new Date().toString(),
    attachments: [],
  }));

  return {
    toAddress: to,
    senderData: encryptedData,
    receiverData: encryptedData,
  };
};
