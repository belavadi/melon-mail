import uniq from 'lodash/uniq';

import ipfs from '../services/ipfsService';
import eth from '../services/ethereumService';
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
      return eth.signIn();
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
        'Something wen\'t wrong or you didn\'t accept the signing process.',
      ));
    });
};

export const registerUser = mailAddress => (dispatch) => {
  eth.checkMailAddress(mailAddress)
    .then((events) => {
      console.log(events);
      return eth.signString(eth.getAccount(), config.stringToSign);
    })
    .then((signedString) => {
      ipfs.uploadToIpfs(welcomeEmail(eth.getAccount(), mailAddress, signedString))
        .then(({ mailHash, threadHash }) =>
          eth._registerUser(mailAddress, signedString, mailHash, threadHash))
        .then((data) => {
          dispatch(registerSuccess(data));
        })
        .catch((error) => {
          console.log(error);
          return dispatch(registerError(error.message));
        });
    })
    .catch((error) => {
      console.log(error);
      dispatch(registerError(error.message));
    });
};

export const fetchContacts = () => (dispatch) => {
  // const start = Date.now();
  eth.fetchAllEvents('inbox')
    .then((inboxEvents) => {
      eth.fetchAllEvents('outbox')
        .then((outboxEvents) => {
          const allEvents = uniq([
            ...inboxEvents.map(event => event.args.from),
            ...outboxEvents.map(event => event.args.to),
          ]);
          const fetchAddresses = allEvents.map(address => eth.getAddressInfo(address));
          Promise.all(fetchAddresses)
            .then((addresses) => {
              const contacts = addresses.map(events => web3.toAscii(events[0].args.username));
              // console.log(`Fetched contacts in ${(Date.now() - start) / 1000}s`);
              // console.log(contacts);
              dispatch(contactsSuccess(contacts));
            });
        });
    });
};
