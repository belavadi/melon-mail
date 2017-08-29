import ipfs from '../services/ipfsService';
import eth from '../services/ethereumService';

const concat = require('concat-stream');

export const mailRequest = () => ({
  type: 'MAIL_REQUEST',
});

export const mailSuccess = thread => ({
  type: 'MAIL_SUCCESS',
  thread,
});

export const mailError = error => ({
  type: 'MAIL_ERROR',
  error,
});

export const getThread = (threadId, afterBlock) => (dispatch) => {
  dispatch(mailRequest());

  eth.getThread(threadId, afterBlock)
    .then((threadEvent) => {
      console.log(threadEvent);
      return ipfs.getThread(threadEvent.args.threadHash);
    })
    .then((thread) => {
      console.log(thread);
      const mailLinks = thread.toJSON().links;

      const promises = mailLinks.map(mailLink => ipfs.getFileStream(mailLink.multihash));

      return Promise.all(promises);
    })
    .then((mails) => {
      const promises = mails.map(mail => new Promise((resolve) => {
        mail.pipe(concat(data => resolve(new TextDecoder('utf-8').decode(data))));
      }));

      return Promise.all(promises);
    })
    .then((mails) => {
      console.log(mails);
      dispatch(mailSuccess(mails));
    })
    .catch((error) => {
      console.log(error);
      dispatch(mailError(error.message));
    });
};

export const sendMail = (mail) => {
  ipfs.uploadMail(mail)
    .then((mailLink) => {
      const mailObject = mailLink.length ? mailLink[0] : mailLink;
      return ipfs.newThread(mailObject);
    })
    .then((threadLink) => {
      console.log(threadLink.toJSON());
      const multihash = threadLink.toJSON().multihash;
      return eth._sendEmail(mail.to, multihash, multihash);
    })
    .then((res) => {
      console.log(res);
    })
    .catch((error) => {
      console.log(error);
    });
};


export const mailsRequest = () => ({
  type: 'MAILS_REQUEST',
});

export const mailsSuccess = mails => ({
  type: 'MAILS_SUCCESS',
  mails,
});

export const mailsError = error => ({
  type: 'MAILS_ERROR',
  error,
});

export const getMails = folder => (dispatch, getState) => {
  const startingBlock = getState().user.startingBlock;
  eth.getMails(folder, startingBlock)
    .then((mailEvents) => {
      console.log(mailEvents);

      const ipfsFetchPromises = mailEvents.map(mail => ipfs.getFileStream(mail.args.mailHash));

      return Promise.all(ipfsFetchPromises)
        .then((ipfsMails) => {
          console.log(ipfsMails);
          const ipfsReadPromises = ipfsMails.map(mail => new Promise((resolve) => {
            mail.pipe(concat(data => resolve(new TextDecoder('utf-8').decode(data))));
          }));
          return Promise.all(ipfsReadPromises);
        })
        .then((mails) => {
          // decrypt here
          const dectyptedMails = mails.map(mail => JSON.parse(mail));
          console.log(dectyptedMails);
          const mailsWithEventInfo = dectyptedMails.map((mail, index) => ({
            transactionHash: mailEvents[index].transactionHash,
            blockNumber: mailEvents[index].blockNumber,
            ...mailEvents[index].args,
            ...mail,
          }));
          console.log(mailsWithEventInfo);
          dispatch(mailsSuccess(mailsWithEventInfo));
        })
        .catch((error) => {
          console.log(error);
          dispatch(mailsError(error));
        });
    })
    .catch((error) => {
      console.log(error);
      dispatch(mailsError(error));
    });
};
