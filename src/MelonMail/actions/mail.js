import sha3 from 'solidity-sha3';
import uniqBy from 'lodash/uniqBy';

import ipfs from '../services/ipfsService';
import eth from '../services/ethereumService';
import { decrypt } from '../services/cryptoService';
import { closeCompose, changeComposeState } from './compose';

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
  dispatch(changeComposeState('UPLOADING_MAIL'));
  return ipfs.uploadData(mail)
    .then((mailLink) => {
      const mailObject = mailLink.length ? mailLink[0] : mailLink;
      if (threadId) {
        const threadHash = getState().mail.threadHash;
        dispatch(changeComposeState('UPDATING_THREAD'));
        return ipfs.replyToThread(mailObject, threadHash)
          .then((threadLink) => {
            const multihash = threadLink.toJSON().multihash;
            dispatch(changeComposeState('SENDING'));
            return eth._sendEmail(mail.toAddress, mailObject.hash, multihash, threadId);
          });
      }
      dispatch(changeComposeState('CREATING_THREAD'));
      return ipfs.newThread(mailObject)
        .then((threadLink) => {
          const multihash = threadLink.toJSON().multihash;
          dispatch(changeComposeState('SENDING'));
          return eth._sendEmail(mail.toAddress, mailObject.hash, multihash, sha3(multihash));
        });
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

export const mailsSuccess = (mailType, mails, fetchedFromBlock) => (
  mailType === 'inbox' ?
    { type: 'MAILS_INBOX_SUCCESS', mails, fetchedFromBlock } :
    { type: 'MAILS_OUTBOX_SUCCESS', mails, fetchedFromBlock }
);

export const mailsError = (mailType, error) => (
  mailType === 'inbox' ?
    { type: 'MAILS_INBOX_ERROR', error } :
    { type: 'MAILS_OUTBOX_ERROR', error }
);

export const newMail = (mailType, mails) => (
  mailType === 'inbox' ?
    { type: 'NEW_INBOX_MAIL', mails } :
    { type: 'NEW_OUTBOX_MAIL', mails }
);

export const mailsNoMore = () => ({
  type: 'MAILS_NO_MORE',
});

export const getMails = folder => (dispatch, getState) => {
  const userStartingBlock = getState().user.startingBlock;
  const keys = {
    publicKey: getState().user.publicKey,
    privateKey: getState().user.privateKey,
  };
  const fetchToBlock = folder === 'inbox' ?
    getState().mails.inboxFetchedFromBlock : getState().mails.outboxFetchedFromBlock;
  const blocksInBatch = folder === 'inbox' ?
    getState().mails.inboxBatchSize : getState().mails.outboxBatchSize;
  if (fetchToBlock !== null && fetchToBlock <= userStartingBlock) {
    dispatch(mailsNoMore());
    return;
  }
  dispatch(mailsRequest(folder));
  eth.getMails(folder, fetchToBlock, blocksInBatch, userStartingBlock)
    .then((res) => {
      const { mailEvents, fromBlock } = res;
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
          const newMailsState = [...getState().mails[folder], ...decryptedMails];
          dispatch(mailsSuccess(folder, uniqBy(newMailsState, 'threadId'), fromBlock));
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

export const listenForMails = () => (dispatch, getState) => {
  console.log('listening for mail');
  eth.listenForMails((mailEvent, mailType) => {
    ipfs.getFileContent(mailEvent.args.mailHash)
      .then((ipfsContent) => {
        const encryptedMail = JSON.parse(ipfsContent);
        const mailContent = mailType === 'inbox' ?
          encryptedMail.receiverData : encryptedMail.senderData;
        const keys = {
          publicKey: getState().user.publicKey,
          privateKey: getState().user.privateKey,
        };
        const mail = {
          transactionHash: mailEvent.transactionHash,
          blockNumber: mailEvent.blockNumber,
          ...mailEvent.args,
          ...JSON.parse(decrypt(keys, mailContent)),
        };

        if (mailType === 'inbox') {
          const mails = [mail, ...getState().mails.inbox];
          dispatch(newMail('inbox', uniqBy(mails, 'threadId')));
        } else {
          const mails = [mail, ...getState().mails.outbox];
          dispatch(newMail('outbox', uniqBy(mails, 'threadId')));
        }
        if (mailEvent.args.threadId === getState().mail.threadId) {
          dispatch(getThread(mailEvent.args.threadId, 0));
        }
        console.log(mailContent);
      });
  });
};

export const downloadAttachment = attachment => (dispatch, getState) => {
  const keys = {
    publicKey: getState().user.publicKey,
    privateKey: getState().user.privateKey,
  };
  ipfs.getFileContent(attachment.hash)
    .then((ipfsContent) => {
      const decryptedAttachment = JSON.parse(
        decrypt(keys, ipfsContent.substr(1, ipfsContent.length - 2)),
      );
      const splitData = decryptedAttachment.fileData.split(',');
      const fileType = splitData[0].substring(5).split(';')[0];
      const byteCharacters = atob(splitData[1]);
      const byteNumbers = [...byteCharacters].map(char => char.charCodeAt(0));

      const byteArray = new Uint8Array(byteNumbers);

      const blob = new Blob([byteArray], { type: fileType });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = attachment.name;
      link.click();
    })
    .catch(err => console.error(err));
};
