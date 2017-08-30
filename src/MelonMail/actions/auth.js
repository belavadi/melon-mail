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

export const noConnection = () => ({
  type: 'NO_CONNECTION',
  stage: 'noConnection',
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
      return dispatch(authError('Login failed.'));
    })
    .catch((result) => {
      if (window.web3 === undefined) {
        return dispatch(noConnection());
      }
      if (!result.error && result.notRegistered) {
        return dispatch(userNotRegistered());
      }
      return dispatch(authError('Login failed.'));
    });
};

export const registerUser = username => (dispatch) => {
  eth.signString(eth.getAccount(), contract.stringToSign)
    .then(signedString =>
      eth._registerUser(username, signedString))
    .then((data) => {
      dispatch(registerSuccess(data));
    })
    .catch((error) => {
      dispatch(registerError(error));
    });
};
