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

export const fetchMail = id => (dispatch) => {
  dispatch(mailRequest());

  ipfs.getThread(id)
    .then((thread) => {
      const mailLinks = thread.toJSON().links;

      const promises = [];
      mailLinks.forEach((mailLink) => {
        promises.push(ipfs.getFileStream(mailLink.multihash));
      });

      return Promise.all(promises);
    })
    .then((mails) => {
      const promises = [];
      mails.forEach((mail) => {
        promises.push(new Promise((resolve) => {
          mail.pipe(concat(data => resolve(new TextDecoder('utf-8').decode(data))));
        }));
      });

      return Promise.all(promises);
    })
    .then((mails) => {
      console.log(mails);
      dispatch(mailSuccess(mails));
    })
    .catch((error) => {
      dispatch(mailError(error));
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
      return eth.sendEmailContract(mail.to, multihash, multihash);
    })
    .then((res) => {
      console.log(res);
    })
    .catch((error) => {
      console.log(error);
    });
};
