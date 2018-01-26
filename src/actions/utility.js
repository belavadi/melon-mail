import union from 'lodash/union';
import uniq from 'lodash/uniq';
import isEqual from 'lodash/isEqual';

import eth from '../services/ethereumService';
import ipfs from '../services/ipfsService';

import { useLocalStorage } from '../../config/config.json';
import { keccak256 } from '../services/helperService';
import { encrypt, decrypt } from '../services/cryptoService';

export const updateBalance = balance => ({
  type: 'UPDATE_BALANCE',
  balance,
});

export const contactsUpdated = contacts => ({
  type: 'CONTACTS_UPDATE',
  contacts,
});

export const contactsImport = contacts => ({
  type: 'CONTACTS_IMPORT',
  contacts,
});

export const contactsBackupFailed = () => ({
  type: 'CONTACTS_BACKUP_FAILED',
});

export const contactsBackupAlready = () => ({
  type: 'CONTACTS_BACKUP_ALREADY',
});

export const resetBackupState = () => ({
  type: 'RESET_BACKUP_STATE',
});

export const getBalance = () => (dispatch) => {
  eth.getBalance()
    .then((balance) => {
      dispatch(updateBalance(balance));
    })
    .catch(err => console.log(err));
};

export const initialAppSetup = config => ({
  type: 'INITIAL_SETUP',
  config,
});

export const saveContactsToLocalStorage = (contactName, mailHash) => (dispatch, getState) => {
  if (!useLocalStorage) {
    return;
  }

  const contactsItem = localStorage.getItem(mailHash);

  const keys = {
    publicKey: getState().user.publicKey,
    privateKey: getState().user.privateKey,
  };

  if (contactsItem) {
    const contactObject = JSON.parse(decrypt(keys, contactsItem));

    if (contactObject.contacts.indexOf(contactName) === -1) {
      contactObject.contacts.push(contactName);
      localStorage.setItem(mailHash, encrypt(keys, JSON.stringify(contactObject)));
    }
  } else {
    localStorage.setItem(mailHash, encrypt(keys, JSON.stringify({ contacts: [contactName] })));
  }
};

const fetchContacts = async (wallet, currUserHash, folder) => {
  const keys = {
    publicKey: wallet.publicKey,
    privateKey: wallet.privateKey,
  };
  const events = await eth.fetchAllEvents(wallet, folder);
  const uniqueEvents = uniq([
    ...events.map(event => event.mailHash),
  ]);

  const ipfsPromises = uniqueEvents.map(hash => ipfs.getFileContent(hash));
  const mails = await Promise.all(ipfsPromises);

  const contacts = mails.map((mail) => {
    if (folder === 'inbox') {
      const receiverData = JSON.parse(mail).receiverData;
      const receiversMail = decrypt(keys, receiverData);
      return JSON.parse(receiversMail).from;
    }

    if (folder === 'outbox') {
      const sendersData = JSON.parse(mail).senderData;
      const sendersMail = decrypt(keys, sendersData);
      return JSON.parse(sendersMail).to;
    }

    return '';
  });

  if (useLocalStorage) {
    localStorage.setItem(currUserHash, encrypt(keys,
      JSON.stringify({ contacts })));
  }

  return contacts;
};

export const backupContacts = () => async (dispatch, getState) => {
  const wallet = getState().user.wallet;
  const userMail = getState().user.mailAddress;
  const currUserHash = keccak256(userMail);

  const keys = {
    publicKey: getState().user.publicKey,
    privateKey: getState().user.privateKey,
  };

  const inboxContacts = await fetchContacts(wallet, currUserHash, 'inbox');
  const outboxContacts = await fetchContacts(wallet, currUserHash, 'inbox');

  let contacts = uniq([
    ...inboxContacts,
    ...outboxContacts,
  ]);

  contacts = contacts.filter(m => m !== userMail);

  if (contacts.length === 0) {
    dispatch(contactsBackupAlready());
    return;
  }

  const storedContacts = { contacts };

  try {
    const event = await eth.getContactsForUser(wallet, currUserHash);
    if (!event) {
      const newContact = storedContacts;
      // encrypt the contacts
      const encryptedData = encrypt(keys, JSON.stringify(newContact));
      const contactLink = await ipfs.uploadData(encryptedData);
      const ipfsHash = contactLink.length > 0 ? contactLink[0].hash : contactLink;

      console.log('IPFS hash for the contacts: ', ipfsHash);
      await eth._updateContacts(wallet, currUserHash, ipfsHash);
      dispatch(contactsUpdated(newContact.contacts));
    } else {
      const ipfsContent = await ipfs.getFileContent(event.fileHash);
      const decryptedContacts = decrypt(keys, JSON.parse(ipfsContent));

      const joinedContacts = union(storedContacts.contacts, JSON.parse(decryptedContacts).contacts);

      // only write to ipfs if we have some new data and add it to the list of contacts
      if (!isEqual(joinedContacts.sort(), JSON.parse(decryptedContacts).contacts.sort())) {
        const updatedContacts = encrypt(keys, JSON.stringify({ contacts: joinedContacts }));

        const contactLink = await ipfs.uploadData(updatedContacts);
        const newIpfsHash = contactLink.length > 0 ? contactLink[0].hash : contactLink;

        await eth._updateContacts(wallet, currUserHash, newIpfsHash);
        dispatch(contactsUpdated(storedContacts.contacts));
      } else {
        dispatch(contactsBackupAlready());
      }
    }
  } catch (e) {
    console.error(e);
    dispatch(contactsBackupFailed());
  }
};

export const importContacts = () => async (dispatch, getState) => {
  const wallet = getState().user.wallet;
  const currUserHash = keccak256(getState().user.mailAddress);

  const keys = {
    publicKey: wallet.publicKey,
    privateKey: wallet.privateKey,
  };

  const event = await eth.getContactsForUser(wallet, currUserHash);
  if (event && event.fileHash) {
    const ipfsContent = await ipfs.getFileContent(event.fileHash);
    const decryptedContacts = decrypt(keys, JSON.parse(ipfsContent));

    dispatch(contactsImport(JSON.parse(decryptedContacts).contacts));

    if (useLocalStorage) localStorage.setItem(currUserHash, JSON.parse(ipfsContent));
  } else {
    if (!useLocalStorage) {
      return;
    }

    const contactsItem = localStorage.getItem(currUserHash);

    if (contactsItem) {
      const contactObject = JSON.parse(decrypt(keys, contactsItem));

      dispatch(contactsImport(contactObject.contacts));
    }
  }
};

export const backupProgressReset = () => (dispatch) => {
  dispatch(resetBackupState());
};

export const scrollTo = (element, to, duration) => {
  if (duration <= 0) return;
  const difference = to - element.scrollTop;
  const perTick = (difference / duration) * 10;

  setTimeout(() => {
    // eslint-disable-next-line
    element.scrollTop += perTick;
    if (element.scrollTop === to) return;
    scrollTo(element, to, duration - 10);
  }, 10);
};

export const saveLastActiveTimestamp = () => (dispatch, getState) => {
  const currUserHash = keccak256(getState().user.mailAddress);
  localStorage.setItem(`lastactive-${currUserHash}`, Date.now());
};

export const initializeLastActiveListener = () => (dispatch, getState) => {
  if (!useLocalStorage) { return; }
  window.addEventListener('beforeunload', () => {
    saveLastActiveTimestamp()(dispatch, getState);
  });
};

export const getLastActiveTimestamp = () => (dispatch, getState) => {
  const currUserHash = keccak256(getState().user.mailAddress);
  return localStorage.getItem(`lastactive-${currUserHash}`);
};
