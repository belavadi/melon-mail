import eth from '../services/ethereumService';
import config from '../../config/config.json';

export const addWallet = wallet => ({
  type: 'ADD_WALLET',
  stage: 'check',
  wallet,
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

export const loginSuccess = data => ({
  type: 'LOGIN_SUCCESS',
  data,
});

export const unsecureContext = () => ({
  type: 'UNSECURE_CONTEXT',
  stage: 'unsecureContext',
});

export const logout = () => ({
  type: 'CLEAR_STORE',
});

export const contactsSuccess = contacts => ({
  type: 'CONTACTS_SUCCESS',
  contacts,
});

export const userIsRegistering = (account) => {
  localStorage.setItem(`isregistering-${account}`, true);
};

export const userRegistrationMined = (account) => {
  localStorage.removeItem(`isregistering-${account}`);
};

export const checkRegistration = wallet => async (dispatch) => {
  if (!window.isSecureContext && window.isSecureContext !== undefined) {
    return dispatch(unsecureContext());
  }

  try {
    const user = await eth.checkRegistration(wallet);

    if (!user.error && user.notRegistered) {
      return dispatch(userNotRegistered());
    }

    eth.signIn(user.mailAddress);
  } catch (e) {
    return console.error(e);
  }
  // eth.checkRegistration(wallet)
  //   .then((data) => {
  //     if (config.useLocalStorage) {
  //       userRegistrationMined(data.address);
  //     }
  //     dispatch(userIsRegistered(data));
  //     return eth.signIn(data.mailAddress);
  //   })
  //   .then((result) => {
  //     if (result.status) {
  //       return dispatch(loginSuccess(result));
  //     }
  //     console.error(result.error);
  //     return dispatch(authError('You need to sign the string in order to login.'));
  //   })
  //   .catch((result) => {
  //     console.error(result);
  //     if (!result.error && result.notRegistered) {
  //       return dispatch(userNotRegistered());
  //     }
  //     return dispatch(authError(
  //       'Something went wrong or you didn\'t accept the signing process.',
  //     ));
  //   });
};

export const startListener = () => (dispatch, getState) => {
  if (config.useLocalStorage) {
    // eth.listenUserRegistered((event) => {
    //   userRegistrationMined(event.args.addr);
    //   if (getState().router.path === 'auth') {
    //     dispatch(checkRegistration());
    //   }
    // });
  }
};

export const registerUser = (mailAddress, wallet) => (dispatch, getState) => {
  eth.checkMailAddress(mailAddress)
    .then(() => eth._registerUser(mailAddress, wallet))
    .then((data) => {
      if (config.useLocalStorage) {
        userIsRegistering(getState().user.activeAccount);
      }
      dispatch(registerSuccess(data));
    })
    .catch((error) => {
      dispatch(registerError(error.message));
    });
};

