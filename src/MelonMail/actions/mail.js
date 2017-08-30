import sha3 from 'solidity-sha3';

import ipfs from '../services/ipfsService';
import eth from '../services/ethereumService';
import { decrypt } from '../services/cryptoService';

export const mailRequest = () => ({
  type: 'MAIL_REQUEST',
});

export const mailSuccess = (thread, threadHash, threadId) => ({
  type: 'MAIL_SUCCESS',
  thread,
  threadHash,
  threadId,
});

export const mailError = error => ({
  type: 'MAIL_ERROR',
  error,
});

export const getThread = (threadId, afterBlock) => (dispatch, getState) => {
  dispatch(mailRequest());
  const keys = {
    publicKey: getState().user.publicKey,
    privateKey: getState().user.privateKey,
  };
  const folder = getState().mails.folder;
  eth.getThread(threadId, afterBlock)
    .then((threadEvent) => {
      console.log(threadEvent);
      return ipfs.getThread(threadEvent.args.threadHash)
        .then((thread) => {
          console.log(thread);
          const mailLinks = thread.toJSON().links;

          const ipfsFetchPromises = mailLinks.map(mailLink =>
            ipfs.getFileContent(mailLink.multihash));

          Promise.all(ipfsFetchPromises)
            .then((mails) => {
              // decrypt here
              const decryptedMails = mails.map((mail) => {
                const mailToDecrypt = JSON.parse(mail);
                let mailBody;
                if (folder === 'inbox') {
                  mailBody = mailToDecrypt.toAddress === eth.getAccount() ?
                    mailToDecrypt.receiverData : mailToDecrypt.senderData;
                } else {
                  mailBody = mailToDecrypt.toAddress === eth.getAccount() ?
                    mailToDecrypt.senderData : mailToDecrypt.receiverData;
                }
                return JSON.parse(decrypt(keys, mailBody));
              });
              const mailsWithIpfsHash = decryptedMails.map((mail, index) => ({
                hash: mailLinks[index].multihash,
                ...mail,
              }));
              console.log(mailsWithIpfsHash);
              const threadHash = threadEvent.args.threadHash;
              console.log(threadHash);
              dispatch(mailSuccess(mailsWithIpfsHash, threadHash, threadId));
            })
            .catch((error) => {
              console.log(error);
              dispatch(mailError(error.message));
            });
        });
    })
    .catch((error) => {
      console.log(error);
      dispatch(mailError(error.message));
    });
};

export const sendMail = (mail, threadId) => (dispatch, getState) => {
  console.log(mail);
  ipfs.uploadMail(mail)
    .then((mailLink) => {
      const mailObject = mailLink.length ? mailLink[0] : mailLink;
      if (threadId) {
        const threadHash = getState().mail.threadHash;
        ipfs.replyToThread(mailObject, threadHash)
          .then((threadLink) => {
            const multihash = threadLink.toJSON().multihash;
            return eth._sendEmail(mail.toAddress, mailObject.hash, multihash, threadId);
          });
      } else {
        ipfs.newThread(mailObject)
          .then((threadLink) => {
            console.log(mailLink);
            const multihash = threadLink.toJSON().multihash;
            return eth._sendEmail(mail.toAddress, mailObject.hash, multihash, sha3(multihash));
          });
      }
    })
    .catch((error) => {
      console.log(error);
    });
};

export const changeMailsFolder = folder => ({
  type: 'MAILS_FOLDER_CHANGE',
  folder,
});

export const mailsInboxRequest = () => ({
  type: 'MAILS_INBOX_REQUEST',
});

export const mailsInboxSuccess = mails => ({
  type: 'MAILS_INBOX_SUCCESS',
  mails,
});

export const mailsInboxError = error => ({
  type: 'MAILS_INBOX_ERROR',
  error,
});

export const newMailInbox = mail => ({
  type: 'NEW_INBOX_MAIL',
  mail,
});

export const mailsOutboxRequest = () => ({
  type: 'MAILS_OUTBOX_REQUEST',
});

export const mailsOutboxSuccess = mails => ({
  type: 'MAILS_OUTBOX_SUCCESS',
  mails,
});

export const mailsOutboxError = error => ({
  type: 'MAILS_OUTBOX_ERROR',
  error,
});

export const newMailOutbox = mail => ({
  type: 'NEW_OUTBOX_MAIL',
  mail,
});

export const getMails = folder => (dispatch, getState) => {
  dispatch(folder === 'inbox' ?
    mailsInboxRequest() : mailsOutboxRequest());
  const startingBlock = getState().user.startingBlock;
  const keys = {
    publicKey: getState().user.publicKey,
    privateKey: getState().user.privateKey,
  };
  eth.getMails(folder, startingBlock)
    .then((mailEvents) => {
      console.log(mailEvents);

      const ipfsFetchPromises = mailEvents.map(mail => ipfs.getFileContent(mail.args.mailHash));

      return Promise.all(ipfsFetchPromises)
        .then((mails) => {
          // decrypt here
          const decryptedMails = mails.map((mail) => {
            const mailToDecrypt = JSON.parse(mail);
            return JSON.parse(decrypt(
              keys,
              folder === 'inbox' ? mailToDecrypt.receiverData : mailToDecrypt.senderData,
            ));
          });
          console.info(decryptedMails);
          const mailsWithEventInfo = decryptedMails.map((mail, index) => ({
            transactionHash: mailEvents[index].transactionHash,
            blockNumber: mailEvents[index].blockNumber,
            ...mailEvents[index].args,
            ...mail,
          }));
          console.log(mailsWithEventInfo);
          dispatch(folder === 'inbox' ?
            mailsInboxSuccess(mailsWithEventInfo) : mailsOutboxSuccess(mailsWithEventInfo));
        })
        .catch((error) => {
          console.log(error);
          dispatch(folder === 'inbox' ?
            mailsInboxError(error) : mailsOutboxError(error));
        });
    })
    .catch((error) => {
      console.log(error);
      dispatch(folder === 'inbox' ?
        mailsInboxError(error) : mailsOutboxError(error));
    });
};

export const listenForMails = () => (dispatch) => {
  eth.listenForMails((mail) => {
    console.log(mail);
    ipfs.getFileContent(mail.args.mailHash)
      .then((content) => {
        if (mail.to === eth.getAccount()) {
          dispatch(newMailInbox(mail));
        } else {
          dispatch(newMailOutbox(mail));
        }
        console.log(content);
      });
  });
};
