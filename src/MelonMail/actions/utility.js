import union from 'lodash/union';
import uniq from 'lodash/uniq';
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

const fetchContacts = (currUserHash, keys, type) =>
  new Promise((resolve) => {
    eth.fetchAllEvents(type)
      .then((inboxEvents) => {
        const allEvents = uniq([
          ...inboxEvents.map(event => event.args.mailHash),
        ]);

        const ipfsPromises = allEvents.map(hash => ipfs.getFileContent(hash));

        Promise.all(ipfsPromises)
          .then((mailsData) => {
            const mails = mailsData.map((mail) => {
              if (type === 'inbox') {
                const receiverData = JSON.parse(mail).receiverData;
                const receiversMail = decrypt(keys, receiverData);
                return JSON.parse(receiversMail).from;
              }

              if (type === 'outbox') {
                const sendersData = JSON.parse(mail).senderData;
                const sendersMail = decrypt(keys, sendersData);
                return JSON.parse(sendersMail).to;
              }

              return '';
            });

            console.log(mails);

            localStorage.setItem(currUserHash, encrypt(keys, JSON.stringify({ contacts: mails })));

            resolve(mails);
          });
      });
  });

export const backupContacts = () => (dispatch, getState) => {
  const userMail = getState().user.mailAddress;
  const currUserHash = sha3(userMail);

  const keys = {
    publicKey: getState().user.publicKey,
    privateKey: getState().user.privateKey,
  };

  fetchContacts(currUserHash, keys, 'inbox')
    .then((inboxMails) => {
      fetchContacts(currUserHash, keys, 'outbox')
        .then((outboxMails) => {
          let allMails = uniq([
            ...inboxMails,
            ...outboxMails,
          ]);

          allMails = allMails.filter(m => m !== userMail);

          if (allMails.length === 0) {
            console.log('No contact to backup');
            dispatch(contactsBackupAlready());
            return;
          }

          const storedContacts = { contacts: allMails };

          eth.getContactsForUser(currUserHash).then((event) => {
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
                    })
                    .catch(err => console.log(err));
                })
                .catch((err) => {
                  console.log(err);
                });
            } else {
              const ipfsHash = event.args.ipfsHash;

              console.log('IPFS hash: ', ipfsHash);

              ipfs.getFileContent(ipfsHash)
                .then((ipfsContent) => {
                  const encryptedContacts = JSON.parse(ipfsContent);

                  const decryptedContacts = decrypt(keys, encryptedContacts);

                  const joinedContacts = union(storedContacts.contacts,
                    JSON.parse(decryptedContacts).contacts);


                  // only write to ipfs if we have some new data and add it to the list of contacts
                  if (!isEqual(joinedContacts.sort(),
                    JSON.parse(decryptedContacts).contacts.sort())) {
                    const updatedContacts = encrypt(keys,
                      JSON.stringify({ contacts: joinedContacts }));

                    ipfs.uploadData(updatedContacts)
                      .then((contactLink) => {
                        const newIpfsHash = contactLink.length > 0 ?
                          contactLink[0].hash : contactLink;

                        console.log('IPFS hash for the contacts: ', ipfsHash);

                        eth.updateContactsEvent(currUserHash, newIpfsHash)
                          .then(() => {
                            dispatch(contactsUpdated(storedContacts.contacts));
                          })
                          .catch(err => console.log(err));
                      })
                      .catch(err => console.log(err));
                  } else {
                    console.log('All contacts already backuped!');
                    dispatch(contactsBackupAlready());
                  }
                });
            }
          })
            .catch((err) => {
              console.log(err);
              dispatch(contactsBackupFailed());
            });
        });
    });
};

export const importContacts = () => (dispatch, getState) => {
  const currUserHash = sha3(getState().user.mailAddress);

  const keys = {
    publicKey: getState().user.publicKey,
    privateKey: getState().user.privateKey,
  };

  eth.getContactsForUser(currUserHash).then((event) => {
    if (event) {
      const ipfsHash = event.args.ipfsHash;

      if (!ipfsHash) {
        return;
      }

      ipfs.getFileContent(ipfsHash)
        .then((ipfsContent) => {
          const encryptedContacts = JSON.parse(ipfsContent);

          const decryptedContacts = decrypt(keys, encryptedContacts);

          dispatch(contactsImport(JSON.parse(decryptedContacts).contacts));

          localStorage.setItem(currUserHash, encryptedContacts);
        });
    }
  });
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
