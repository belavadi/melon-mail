import bitcore from 'bitcore-lib';

import eth from '../services/ethereumService';
import contract from '../services/contract.json';

export const userNotRegistered = () => ({
  type: 'USER_NOT_REGISTERED',
});

export const userIsRegistered = data => ({
  type: 'USER_IS_REGISTERED',
  data,
});

export const registerSuccess = () => ({
  type: 'REGISTER_SUCCESS',
});

export const registerError = error => ({
  type: 'REGISTER_ERROR',
  error,
});

export const authError = error => ({
  type: 'AUTH_ERROR',
  isFetching: false,
  error,
});

export const loginSuccess = () => ({
  type: 'LOGIN_SUCCESS',
});

export const loginError = error => ({
  type: 'LOGIN_ERROR',
  error,
});

export const checkRegistration = () => (dispatch) => {
  eth.getWeb3Status()
    .then(() => eth.checkRegistration())
    .then((data) => {
      console.log('User registered. Should sign transaction.');
      dispatch(userIsRegistered(data));
      return eth.signIn();
    })
    .then((result) => {
      console.log(result);
      if (result.status) {
        return dispatch(loginSuccess());
      }

      return dispatch(loginError(result.error.toString()));
    })
    .catch((result) => {
      if (!result.error) {
        console.log('User not registered. Go to registration');
        return dispatch(userNotRegistered());
      }
      console.log('Error: ', result.message);
      return dispatch(authError(result.message.toString()));
    });
};

export const registerUser = username => (dispatch) => {
  eth.signString(eth.getAccount(), contract.stringToSign)
    .then((result) => {
      const privateKey = bitcore.PrivateKey.fromString(result.slice(2, 66));
      const publicKey = bitcore.PublicKey.fromPrivateKey(privateKey);
      const email = `${username}@melonmail.eth`;

      return eth.registerUserContract(email, privateKey, publicKey);
    })
    .then((data) => {
      dispatch(registerSuccess(data));
    })
    .catch((error) => {
      dispatch(registerError(error));
    });
};
