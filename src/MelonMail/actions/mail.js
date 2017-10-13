import uniqBy from 'lodash/uniqBy';

import ipfs from '../services/ipfsService';
import eth from '../services/ethereumService';
import { decrypt } from '../services/cryptoService';
import { changeSendState, sendSuccess, sendSuccessClear } from './compose';

export const mailRequest = threadId => ({
  type: 'MAIL_REQUEST',
  threadId,
});

export const mailSuccess = (thread, threadHash, threadId, threadTransaction) => ({
  type: 'MAIL_SUCCESS',
  thread,
  threadHash,
  threadId,
  threadTransaction,
});

export const mailError = error => ({
  type: 'MAIL_ERROR',
  error,
});

export const getThread = (threadId, afterBlock) => (dispatch, getState) => {
  dispatch(mailRequest(threadId));
  const keys = {
    publicKey: getState().user.publicKey,
    privateKey: getState().user.privateKey,
  };
  eth.getThread(threadId, afterBlock)
    .then(threadEvent =>
      eth.getAccount()
        .then(account =>
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
                      const mailBody = mailToDecrypt.toAddress === account ?
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

                  dispatch(
                    mailSuccess(
                      decryptedMails,
                      threadEvent.args.threadHash,
                      threadId,
                      threadEvent.transactionHash),
                  );
                })
                .catch((error) => {
                  console.log(error);
                  dispatch(mailError(error.message));
                });
            }))
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

export const sendMail = (mail, threadId, externalMailContract) => (dispatch, getState) => {
  dispatch(changeSendState('Uploading...', 3));
  return ipfs.uploadData(mail)
    .then((mailLink) => {
      const mailObject = mailLink.length ? mailLink[0] : mailLink;
      if (threadId) {
        const threadHash = getState().mail.threadHash;
        return ipfs.replyToThread(mailObject, threadHash)
          .then((threadLink) => {
            const multihash = threadLink.toJSON().multihash;
            dispatch(changeSendState('Sending mail...', 4));
            return eth._sendEmail(
              mail.toAddress,
              mailObject.hash,
              multihash,
              threadId,
              externalMailContract,
            );
          })
          .then(() => {
            dispatch(sendSuccess());
            setTimeout(() => dispatch(sendSuccessClear()), 2000);
          });
      }
      return ipfs.newThread(mailObject)
        .then((threadLink) => {
          const multihash = threadLink.toJSON().multihash;
          dispatch(changeSendState('Sending mail...', 4));
          return eth._sendEmail(
            mail.toAddress,
            mailObject.hash,
            multihash,
            web3.sha3(multihash),
            externalMailContract,
          );
        })
        .then(() => {
          dispatch(sendSuccess());
          setTimeout(() => dispatch(sendSuccessClear()), 2000);
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
                fromEth: mailEvents[index].args.from,
              };
            } catch (error) {
              console.log(`Failed decrypting mail with hash ${mailEvents[index].args.mailHash}`);
              return {};
            }
          });

          const validateSenderPromises = decryptedMails.map(mail =>
            new Promise((resolve) => {
              if (!mail.from) {
                resolve({});
              }
              const mailDomain = mail.from.split('@')[1];
              return eth.resolveUser(
                mail.from,
                mailDomain,
                mailDomain !== getState().config.defaultDomain,
              )
                .then((userInfo) => {
                  if (userInfo.address === mail.fromEth) resolve(mail);
                  else {
                    console.warn('Found possible malicious mail');
                    console.warn(mail);
                    resolve({});
                  }
                })
                .catch((err) => {
                  console.error(err);
                  resolve({});
                });
            }));
          return Promise.all(validateSenderPromises);
        })
        .then((validatedMails) => {
          const newMailsState = [...getState().mails[folder], ...validatedMails];
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
  eth.listenForMails((mailEvent, mailType) => {
    if (!mailEvent) {
      return;
    }

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
            fromEth: mailEvent.args.from,
          };

          const mailDomain = mail.from.split('@')[1];
          eth.resolveUser(
            mail.from,
            mailDomain,
            mailDomain !== getState().config.defaultDomain,
          )
            .then((userInfo) => {
              if (userInfo.address === mail.fromEth) {
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
              }
            });
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
