import eth from '../services/ethereumService';
import config from '../services/config.json';

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

export const registerUser = username => (dispatch) => {
  eth.checkUsername(username)
    .then((events) => {
      console.log(events);
      eth.signString(eth.getAccount(), config.stringToSign)
        .then(signedString =>
          eth._registerUser(username, signedString))
        .then((data) => {
          dispatch(registerSuccess(data));
        })
        .catch((error) => {
          console.log(error);
          dispatch(authError('Error occured while registering.'));
        });
    })
    .catch((error) => {
      dispatch(registerError(error.message));
    });
};
