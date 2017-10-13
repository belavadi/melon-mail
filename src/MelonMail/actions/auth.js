// import ipfs from '../services/ipfsService';
import eth from '../services/ethereumService';
import ipfs from '../services/ipfsService';
import config from '../services/config.json';
import { welcomeEmail } from '../services/helperService';

export const changeAccount = account => ({
  type: 'ACCOUNT_CHANGE',
  account,
});

export const userNotRegistered = () => ({
  type: 'USER_NOT_REGISTERED',
  stage: 'register',
});

export const userIsRegistered = data => ({
  type: 'USER_IS_REGISTERED',
  stage: 'signIn',
  data,
});

export const registerSuccess = data => ({
  type: 'REGISTER_SUCCESS',
  data,
});

export const registerError = error => ({
  type: 'REGISTER_ERROR',
  error,
});

export const authError = error => ({
  type: 'AUTH_ERROR',
  isFetching: false,
  stage: 'authError',
  error,
});

export const wrongNetwork = () => ({
  type: 'WRONG_NETWORK',
  stage: 'wrongNetwork',
});

export const loginSuccess = data => ({
  type: 'LOGIN_SUCCESS',
  data,
});

export const noConnection = () => ({
  type: 'NO_CONNECTION',
  stage: 'noConnection',
});

export const logout = () => ({
  type: 'CLEAR_STORE',
});

export const contactsSuccess = contacts => ({
  type: 'CONTACTS_SUCCESS',
  contacts,
});

export const checkRegistration = () => (dispatch) => {
  eth.getWeb3Status()
    .then(() => eth.checkRegistration())
    .then((data) => {
      dispatch(userIsRegistered(data));
      return eth.signIn(data.mail);
    })
    .then((result) => {
      if (result.status) {
        return dispatch(loginSuccess(result));
      }
      console.error(result.error);
      return dispatch(authError('You need to sign the string in order to login.'));
    })
    .catch((result) => {
      console.error(result);
      if (window.web3 === undefined) {
        return dispatch(noConnection());
      }
      if (!result.error && result.notRegistered) {
        return dispatch(userNotRegistered());
      }
      if (result.message === 'WRONG_NETWORK') {
        return dispatch(wrongNetwork());
      }
      return dispatch(authError(
        'Something went wrong or you didn\'t accept the signing process.',
      ));
    });
};

export const registerUser = mailAddress => (dispatch) => {
  eth.getAccount()
    .then(account =>
      eth.checkMailAddress(mailAddress)
        .then(() => eth.signString(account, config.stringToSign))
        .then((signedString) => {
          ipfs.uploadToIpfs(welcomeEmail(account, mailAddress, signedString))
            .then(({ mailHash, threadHash }) =>
              eth._sendEmail(account, mailHash, threadHash, web3.sha3(threadHash)))
            .catch((error) => {
              console.log(error);
            });
          return eth._registerUser(mailAddress, signedString);
        })
        .then((data) => {
          dispatch(registerSuccess(data));
        })
        .catch((error) => {
          console.log(error);
          dispatch(registerError(error.message));
        }));
};

