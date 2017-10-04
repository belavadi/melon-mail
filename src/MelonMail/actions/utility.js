import isEqual from 'lodash/isEqual';
import sha3 from 'solidity-sha3';

import eth from '../services/ethereumService';
import ipfs from '../services/ipfsService';

import { encrypt, decrypt } from '../services/cryptoService';

export const updateBalance = balance => ({
  type: 'UPDATE_BALANCE',
  balance,
});

export const contactsUpdated = contacts => ({
  type: 'CONTACTS_UPDATE',
  contacts,
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

export const saveContacts = (contactName, mailHash) => (dispatch, getState) => {
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

export const backupContacts = () => (dispatch, getState) => {
  const currUserHash = sha3(getState().user.mailAddress);

  const keys = {
    publicKey: getState().user.publicKey,
    privateKey: getState().user.privateKey,
  };

  const contactsItem = localStorage.getItem(currUserHash);

  if (!contactsItem) {
    console.log('No contact to backup');
    return;
  }

  const storedContacts = decrypt(keys, contactsItem);
  console.log(storedContacts);

  // check the latest event and see if we already have a contacts obj.
  eth.getContactsForUser().then((event) => {
    if (!event) {
      const newContact = storedContacts;
      // encrypt the contacts
      const encryptedData = encrypt(keys, JSON.stringify(newContact));

      ipfs.uploadData(encryptedData)
        .then((contactLink) => {
          const ipfsHash = contactLink.length > 0 ? contactLink[0].hash : contactLink;

          console.log('IPFS hash for the contacts: ', ipfsHash);
          eth.updateContactsEvent(currUserHash, ipfsHash)
            .then(() => {
              dispatch(contactsUpdated(newContact.contacts));
            });
        })
        .catch((err) => {
          console.log(err);
        });
    } else {
      const ipfsHash = event.returnValues.threadHash;

      ipfs.getFileContent(ipfsHash)
        .then((ipfsContent) => {
          const encryptedContacts = JSON.parse(ipfsContent);

          const decryptedContacts = decrypt(keys, encryptedContacts);

          // only write to ipfs if we have some new data
          if (!isEqual(decryptedContacts, storedContacts)) {
            const updatedContacts = encrypt(keys, storedContacts);

            ipfs.uploadData(updatedContacts)
              .then((contactLink) => {
                const newIpfsHash = contactLink.length > 0 ? contactLink[0].hash : contactLink;

                console.log('IPFS hash for the contacts: ', ipfsHash);

                eth.updateContactsEvent(currUserHash, newIpfsHash)
                  .then(() => {
                    dispatch(contactsUpdated(decryptedContacts.contacts));
                  });
              });
          } else {
            console.log('All contacts already backuped!');
          }
        });
    }
  })
    .catch((err) => {
      console.log(err);
    });
};
