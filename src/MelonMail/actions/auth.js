import bitcore from 'bitcore-lib';

import eth from '../services/ethereumService';
import contract from '../services/contract.json';

export const userNotRegistered = () => ({
  type: 'USER_NOT_REGISTERED',
  stage: 'register',
});

export const userIsRegistered = data => ({
  type: 'USER_IS_REGISTERED',
  data,
  stage: 'signIn',
});

export const registerSuccess = () => ({
  type: 'REGISTER_SUCCESS',
});

export const registerError = error => ({
  type: 'REGISTER_ERROR',
  stage: 'authError',
  error,
});

export const authError = error => ({
  type: 'AUTH_ERROR',
  isFetching: false,
  stage: 'authError',
  error,
});

export const loginSuccess = () => ({
  type: 'LOGIN_SUCCESS',
});

export const loginError = error => ({
  type: 'LOGIN_ERROR',
  stage: 'authError',
  error,
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
        return dispatch(loginSuccess());
      }
      console.error(result.error);
      return dispatch(loginError('Login failed.'));
    })
    .catch((result) => {
      if (!result.error && result.notRegistered) {
        return dispatch(userNotRegistered());
      }
      console.error(result.message);
      return dispatch(authError('Login failed.'));
    });
};

export const registerUser = username => (dispatch) => {
  eth.signString(eth.getAccount(), contract.stringToSign)
    .then((result) => {
      const privateKey = bitcore.PrivateKey.fromString(result.slice(2, 66));
      const publicKey = bitcore.PublicKey.fromPrivateKey(privateKey);
      const email = `${username}@melonmail.eth`;

      return eth._registerUser(email, privateKey, publicKey);
    })
    .then((data) => {
      dispatch(registerSuccess(data));
    })
    .catch((error) => {
      dispatch(registerError(error));
    });
};
