import uniqBy from 'lodash/uniqBy';

import ipfs from '../services/ipfsService';
import eth from '../services/ethereumService';
import { decrypt } from '../services/cryptoService';
import { changeSendState, sendSuccess, sendSuccessClear, sendError } from './compose';
import { welcomeEmailUnencrypted, keccak256 } from '../services/helperService';
import { getLastActiveTimestamp } from './utility';
import { openTransactionModal } from './transaction';

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

export const getThread = (threadId, afterBlock) => async (dispatch, getState) => {
  const { wallet } = getState().user;
  dispatch(mailRequest(threadId));
  if (threadId === 'welcome') {
    dispatch(
      mailSuccess(
        [welcomeEmailUnencrypted(getState().user.mailAddress)],
        'welcome',
        'welcome',
        'welcome'),
    );
    return;
  }
  const keys = {
    publicKey: wallet.publicKey,
    privateKey: wallet.privateKey,
  };
  try {
    const threadEvent = await eth.getThread(wallet, threadId, afterBlock);
    const thread = await ipfs.getThread(threadEvent.threadHash);
    const mailLinks = thread.toJSON().links;

    const ipfsFetchPromises = mailLinks.map(mailLink =>
      ipfs.getFileContent(mailLink.multihash));

    const mails = await Promise.all(ipfsFetchPromises);
    const decryptedMails = mails.map((mail, index) => {
      try {
        const mailToDecrypt = JSON.parse(mail);
        const addrIndex = mailToDecrypt.toAddress.findIndex(item =>
          wallet.address.toLowerCase() === item.toLowerCase());
        const mailBody = addrIndex !== -1 ?
          mailToDecrypt.receiversData[keys.publicKey] : mailToDecrypt.senderData;
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
        threadEvent.threadHash,
        threadId,
        threadEvent.transactionHash),
    );
  } catch (e) {
    dispatch(mailError(e.message));
  }
};

export const clearThread = () => ({
  type: 'MAIL_CLEAR',
});

export const sendMail = (mail, threadId, externalMailContract) => async (dispatch, getState) => {
  const { threadHash } = getState().mail;
  dispatch(changeSendState('Uploading...', 3));
  try {
    // Upload mail to IPFS
    const mailLink = await ipfs.uploadData(mail);
    const mailObject = mailLink.length ? mailLink[0] : mailLink;

    // Get thread multihash information
    const threadLink = threadId ?
      await ipfs.replyToThread(mailObject, threadHash) :
      await ipfs.newThread(mailObject);

    const multihash = threadLink.toJSON().multihash;
    const mailParams = [
      mail.toAddress,
      mailObject.hash,
      multihash,
      threadId || keccak256(multihash),
    ];

    // Send mail
    dispatch(changeSendState('Sending mail...', 4));
    dispatch(openTransactionModal(
      {
        method: eth._sendMail,
        methodName: 'sendEmail',
        params: mailParams,
        additionalParams: [
          externalMailContract,
        ],
      }));
    dispatch(sendSuccess());
    setTimeout(() => dispatch(sendSuccessClear()), 2000);
  } catch (e) {
    dispatch(sendError(e.message));
  }
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

export const getMails = folder => async (dispatch, getState) => {
  const wallet = getState().user.wallet;
  const userStartingBlock = getState().user.startingBlock;
  const keys = {
    publicKey: wallet.publicKey,
    privateKey: wallet.privateKey,
  };
  const fetchToBlock = folder === 'inbox' ?
    getState().mails.inboxFetchedFromBlock : getState().mails.outboxFetchedFromBlock;
  const blocksInBatch = folder === 'inbox' ?
    getState().mails.inboxBatchSize : getState().mails.outboxBatchSize;
  if (fetchToBlock !== null && fetchToBlock <= userStartingBlock) {
    if (folder === 'inbox') {
      const mails = uniqBy([
        ...getState().mails.inbox,
        welcomeEmailUnencrypted(getState().user.mailAddress),
      ], 'threadId');
      dispatch(mailsSuccess('inbox', mails, getState().mails.inboxFetchedFromBlock));
    }
    dispatch(mailsNoMore());
    return;
  }
  dispatch(mailsRequest(folder));
  try {
    const events = await eth.getMails(wallet, folder, fetchToBlock, blocksInBatch);
    const { mailEvents, fromBlock } = events;
    const ipfsFetchPromises = mailEvents.map(mail =>
      ipfs.getFileContent(mail.mailHash).catch((e) => {
        console.log(e);
        Promise.resolve(e);
      }));

    const mails = await Promise.all(ipfsFetchPromises);
    const decryptedMails = mails.map((mail, index) => {
      if (typeof mail !== 'string' || mail === 'timeout') return {};
      try {
        const mailToDecrypt = JSON.parse(mail);
        const mailBody = folder === 'inbox' ? mailToDecrypt.receiversData[keys.publicKey] : mailToDecrypt.senderData;
        const decryptedBody = decrypt(keys, mailBody);
        const parsedBody = JSON.parse(decryptedBody);
        const lastActiveTimestamp = getLastActiveTimestamp()(dispatch, getState);
        return {
          ...mailEvents[index],
          ...parsedBody,
          new: Date.parse(parsedBody.time) > lastActiveTimestamp,
          fromEth: mailEvents[index].from,
        };
      } catch (error) {
        console.log(`Failed decrypting mail with hash ${mailEvents[index].mailHash}`);
        return {};
      }
    });

    const validateSenderPromises = decryptedMails.map(mail =>
      new Promise(async (resolve) => {
        if (!mail.from) {
          resolve({});
        }
        const mailDomain = mail.from.split('@')[1];
        try {
          const userInfo = await eth.resolveUser(wallet,
            mail.from,
            mailDomain,
            mailDomain !== getState().config.defaultDomain,
          );
          if (userInfo.address === mail.fromEth) resolve(mail);
          else {
            console.warn('Found possible malicious mail');
            console.warn(mail);
            resolve({});
          }
        } catch (e) {
          resolve({});
        }
      }));
    const validatedMails = await Promise.all(validateSenderPromises);
    const newMailsState = [...getState().mails[folder], ...validatedMails];
    dispatch(mailsSuccess(folder, uniqBy(newMailsState, 'threadId'), fromBlock));
  } catch (e) {
    dispatch(mailsError(folder, e.message, 0));
  }
};

export const listenForMails = () => (dispatch, getState) => {
  const wallet = getState().user.wallet;

  eth.listenForMails(wallet, (mailEvent, mailType) => {
    if (!mailEvent) {
      return;
    }

    ipfs.getFileContent(mailEvent.mailHash)
      .then((ipfsContent) => {
        try {
          const encryptedMail = JSON.parse(ipfsContent);
          const keys = {
            publicKey: wallet.publicKey,
            privateKey: wallet.privateKey,
          };

          const mailContent = mailType === 'inbox' ?
            encryptedMail.receiversData[keys.publicKey] :
            encryptedMail.senderData;
          const mail = {
            transactionHash: mailEvent.transactionHash,
            blockNumber: mailEvent.blockNumber,
            ...mailEvent,
            ...JSON.parse(decrypt(keys, mailContent)),
            new: mailType === 'inbox',
            fromEth: mailEvent.from,
          };

          const mailDomain = mail.from.split('@')[1];
          eth.resolveUser(
            wallet,
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
                if (mailEvent.threadId === getState().mail.threadId) {
                  dispatch(getThread(mailEvent.threadId, 0));
                }
              }
            });
        } catch (error) {
          console.log(`Failed decrypting mail with hash ${mailEvent.mailHash}`);
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
