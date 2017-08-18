import ipfs from '../services/ipfsService';
import eth from '../services/ethereumService';

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

  // fetch mail
  const thread = [{
    id,
    title: 'Test title',
    from: 'user@mail.com',
    date: '12-03-2017',
  }];
  setTimeout(() => {
    dispatch(mailSuccess(thread));
  }, 300);
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
