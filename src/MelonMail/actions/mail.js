import sha3 from 'solidity-sha3';
import uniqBy from 'lodash/uniqBy';

import ipfs from '../services/ipfsService';
import eth from '../services/ethereumService';
import { decrypt } from '../services/cryptoService';
import { changeSendState, sendSuccess } from './compose';

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
    .then(threadEvent =>
      ipfs.getThread(threadEvent.args.threadHash)
        .then((thread) => {
          const mailLinks = thread.toJSON().links;

          const ipfsFetchPromises = mailLinks.map(mailLink =>
            ipfs.getFileContent(mailLink.multihash));

          Promise.all(ipfsFetchPromises)
            .then((mails) => {
              const decryptedMails = mails.map((mail, index) => {
                try {
                  const mailToDecrypt = JSON.parse(mail);
                  const mailBody = mailToDecrypt.toAddress === eth.getAccount() ?
                    mailToDecrypt.receiverData : mailToDecrypt.senderData;
                  return {
                    ...JSON.parse(decrypt(keys, mailBody)),
                    hash: mailLinks[index].multihash,
                  };
                } catch (error) {
                  console.log(`Failed decrypting mail with hash ${mailLinks[index].multihash}`);
                  return {};
                }
              });

              dispatch(mailSuccess(decryptedMails, threadEvent.args.threadHash, threadId));
            })
            .catch((error) => {
              console.log(error);
              dispatch(mailError(error.message));
            });
        })
        .catch((error) => {
          console.log(error);
          dispatch(mailError(error.message));
        }),
    )
    .catch((error) => {
      console.log(error);
      dispatch(mailError(error.message));
    });
};

export const sendMail = (mail, threadId) => (dispatch, getState) => {
  dispatch(changeSendState('Uploading mail to IPFS...'));
  return ipfs.uploadData(mail)
    .then((mailLink) => {
      const mailObject = mailLink.length ? mailLink[0] : mailLink;
      if (threadId) {
        const threadHash = getState().mail.threadHash;
        return ipfs.replyToThread(mailObject, threadHash)
          .then((threadLink) => {
            const multihash = threadLink.toJSON().multihash;
            dispatch(changeSendState('Sending mail...'));
            return eth._sendEmail(mail.toAddress, mailObject.hash, multihash, threadId);
          })
          .then(() => {
            dispatch(sendSuccess());
          });
      }
      return ipfs.newThread(mailObject)
        .then((threadLink) => {
          const multihash = threadLink.toJSON().multihash;
          dispatch(changeSendState('Sending mail...'));
          return eth._sendEmail(mail.toAddress, mailObject.hash, multihash, sha3(multihash));
        })
        .then(() => {
          dispatch(sendSuccess());
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

export const mailsError = (mailType, error, fetchedFromBlock) => (
  mailType === 'inbox' ?
    { type: 'MAILS_INBOX_ERROR', error, fetchedFromBlock } :
    { type: 'MAILS_OUTBOX_ERROR', error, fetchedFromBlock }
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
  eth.getMails(folder, fetchToBlock, blocksInBatch)
    .then((res) => {
      const { mailEvents, fromBlock } = res;
      const ipfsFetchPromises = mailEvents.map(mail =>
        ipfs.getFileContent(mail.args.mailHash).catch(e => Promise.resolve(e)));

      return Promise.all(ipfsFetchPromises)
        .then((mails) => {
          const decryptedMails = mails.map((mail, index) => {
            if (typeof mail !== 'string' || mail === 'timeout') return {};
            try {
              const mailToDecrypt = JSON.parse(mail);
              const mailBody = folder === 'inbox' ? mailToDecrypt.receiverData : mailToDecrypt.senderData;
              const decryptedBody = decrypt(keys, mailBody);
              return {
                transactionHash: mailEvents[index].transactionHash,
                blockNumber: mailEvents[index].blockNumber,
                ...mailEvents[index].args,
                ...JSON.parse(decryptedBody),
              };
            } catch (error) {
              console.log(`Failed decrypting mail with hash ${mailEvents[index].args.mailHash}`);
              return {};
            }
          });
          const newMailsState = [...getState().mails[folder], ...decryptedMails];
          dispatch(mailsSuccess(folder, uniqBy(newMailsState, 'threadId'), fromBlock));
        })
        .catch((error) => {
          console.log(error);
          dispatch(mailsError(folder, error, fromBlock));
        });
    })
    .catch((error) => {
      console.log(error);
      dispatch(mailsError(folder, error, 0));
    });
};

export const listenForMails = () => (dispatch, getState) => {
  console.log('Listening for mail');
  eth.listenForMails((mailEvent, mailType) => {
    ipfs.getFileContent(mailEvent.args.mailHash)
      .then((ipfsContent) => {
        try {
          const encryptedMail = JSON.parse(ipfsContent);
          const mailContent = mailType === 'inbox' ? encryptedMail.receiverData : encryptedMail.senderData;
          const keys = {
            publicKey: getState().user.publicKey,
            privateKey: getState().user.privateKey,
          };
          const mail = {
            transactionHash: mailEvent.transactionHash,
            blockNumber: mailEvent.blockNumber,
            ...mailEvent.args,
            ...JSON.parse(decrypt(keys, mailContent)),
            new: mailType === 'inbox',
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
        } catch (error) {
          console.log(`Failed decrypting mail with hash ${mailEvent.args.mailHash}`);
        }
      });
  });
};

export const attachmentRequest = (mailIndex, attachmentIndex) => ({
  type: 'ATTACHMENT_REQUEST',
  attachmentIndex,
  mailIndex,
});

export const attachmentSuccess = (mailIndex, attachmentIndex, attachment) => ({
  type: 'ATTACHMENT_SUCCESS',
  attachmentIndex,
  mailIndex,
  attachment,
});

export const attachmentError = (mailIndex, attachmentIndex) => ({
  type: 'ATTACHMENT_ERROR',
  attachmentIndex,
  mailIndex,
});

export const downloadAttachment = (attachment, mailIndex, attachmentIndex) =>
  (dispatch, getState) => {
    const keys = {
      publicKey: getState().user.publicKey,
      privateKey: getState().user.privateKey,
    };
    dispatch(attachmentRequest(mailIndex, attachmentIndex));

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

        return dispatch(attachmentSuccess(mailIndex, attachmentIndex, attachment));
      })
      .catch((err) => {
        console.error(err);
        dispatch(attachmentError(mailIndex, attachmentIndex));
      });
  };
