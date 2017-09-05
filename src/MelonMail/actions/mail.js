import sha3 from 'solidity-sha3';

import ipfs from '../services/ipfsService';
import eth from '../services/ethereumService';
import { decrypt } from '../services/cryptoService';
import { closeCompose } from './compose';

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
  eth.getThread(threadId, afterBlock)
    .then(threadEvent => (
      ipfs.getThread(threadEvent.args.threadHash)
        .then((thread) => {
          const mailLinks = thread.toJSON().links;

          const ipfsFetchPromises = mailLinks.map(mailLink =>
            ipfs.getFileContent(mailLink.multihash));

          Promise.all(ipfsFetchPromises)
            .then((mails) => {
              const decryptedMails = mails.map((mail, index) => {
                const mailToDecrypt = JSON.parse(mail);
                const mailBody = mailToDecrypt.toAddress === eth.getAccount() ?
                  mailToDecrypt.receiverData : mailToDecrypt.senderData;
                return {
                  ...JSON.parse(decrypt(keys, mailBody)),
                  hash: mailLinks[index].multihash,
                };
              });

              dispatch(mailSuccess(decryptedMails, threadEvent.args.threadHash, threadId));
            })
            .catch((error) => {
              console.log(error);
              dispatch(mailError(error.message));
            });
        })
    ))
    .catch((error) => {
      console.log(error);
      dispatch(mailError(error.message));
    });
};

export const sendMail = (mail, threadId) => (dispatch, getState) => {
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
            const multihash = threadLink.toJSON().multihash;
            dispatch(closeCompose());
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

export const mailsRequest = mailType => (
  mailType === 'inbox' ?
    { type: 'MAILS_INBOX_REQUEST' } :
    { type: 'MAILS_OUTBOX_REQUEST' }
);

export const mailsSuccess = (mailType, mails) => (
  mailType === 'inbox' ?
    { type: 'MAILS_INBOX_SUCCESS', mails } :
    { type: 'MAILS_OUTBOX_SUCCESS', mails }
);

export const mailsError = (mailType, error) => (
  mailType === 'inbox' ?
    { type: 'MAILS_INBOX_ERROR', error } :
    { type: 'MAILS_OUTBOX_ERROR', error }
);

export const newMail = (mailType, mail) => (
  mailType === 'inbox' ?
    { type: 'NEW_INBOX_MAIL', mail } :
    { type: 'NEW_OUTBOX_MAIL', mail }
);

export const getMails = folder => (dispatch, getState) => {
  dispatch(mailsRequest(folder));
  const startingBlock = getState().user.startingBlock;
  const keys = {
    publicKey: getState().user.publicKey,
    privateKey: getState().user.privateKey,
  };
  eth.getMails(folder, startingBlock)
    .then((mailEvents) => {
      const ipfsFetchPromises = mailEvents.map(mail => ipfs.getFileContent(mail.args.mailHash));

      return Promise.all(ipfsFetchPromises)
        .then((mails) => {
          const decryptedMails = mails.map((mail, index) => {
            const mailToDecrypt = JSON.parse(mail);
            const mailBody = folder === 'inbox' ? mailToDecrypt.receiverData : mailToDecrypt.senderData;
            return {
              transactionHash: mailEvents[index].transactionHash,
              blockNumber: mailEvents[index].blockNumber,
              ...mailEvents[index].args,
              ...JSON.parse(decrypt(keys, mailBody)),
            };
          });
          dispatch(mailsSuccess(folder, decryptedMails));
        })
        .catch((error) => {
          console.log(error);
          dispatch(mailsError(folder, error));
        });
    })
    .catch((error) => {
      console.log(error);
      dispatch(mailsError(folder, error));
    });
};

export const listenForMails = () => (dispatch) => {
  eth.listenForMails((mail) => {
    ipfs.getFileContent(mail.args.mailHash)
      .then((content) => {
        if (mail.to === eth.getAccount()) {
          dispatch(newMail('inbox', mail));
        } else {
          dispatch(newMail('outbox', mail));
        }
        console.log(content);
      });
  });
};
