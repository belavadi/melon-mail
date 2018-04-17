import eth from '../services/ethereumService';
import config from '../../config/config.json';
import { decrypt, encrypt } from '../services/cryptoService';
import { keccak256 } from '../services/helperService';
import { openTransactionModal } from './transaction';

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
  isFetching: false,
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
  isFetching: false,
  data,
});

export const unsecureContext = () => ({
  type: 'UNSECURE_CONTEXT',
  stage: 'unsecureContext',
});

export const logout = () => {
  localStorage.removeItem('wallet:melon.email');
  return {
    type: 'CLEAR_STORE',
  };
};

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

export const checkRegistration = () => async (dispatch, getState) => {
  if (!window.isSecureContext && window.isSecureContext !== undefined) {
    return dispatch(unsecureContext());
  }
  const wallet = getState().user.wallet;

  try {
    const user = await eth.checkRegistration(wallet);

    if (!user.error && user.notRegistered) {
      return dispatch(userNotRegistered());
    }

    return dispatch(loginSuccess({
      startingBlock: user.startingBlock,
      mailAddress: decrypt({
        privateKey: wallet.privateKey,
        publicKey: wallet.publicKey,
      }, user.mailAddress),
    }));
  } catch (e) {
    return console.error(e.message);
  }
};

export const startListener = () => (dispatch, getState) => {
  const wallet = getState().user.wallet;
  if (config.useLocalStorage) {
    eth.listenUserRegistered(wallet, (event) => {
      userRegistrationMined(event.addr);
      if (getState().router.path === 'auth') {
        dispatch(checkRegistration());
      }
    });
  }
};

export const registerUser = mailAddress => async (dispatch, getState) => {
  const wallet = getState().user.wallet;
  try {
    const isAvailable = await eth.checkMailAddress(wallet, mailAddress);
    if (isAvailable) {
      const encryptedUsername = encrypt({
        privateKey: wallet.privateKey,
        publicKey: wallet.publicKey,
      }, mailAddress);
      const hashedUsername = keccak256(mailAddress);
      dispatch(openTransactionModal(
        {
          method: eth._registerUser,
          methodName: 'registerUser',
          params: [
            hashedUsername,
            encryptedUsername,
            wallet.publicKey,
          ],
          additionalParams: [
            mailAddress,
          ],
        }));
      // dispatch(registerSuccess(data));
    }
  } catch (e) {
    dispatch(registerError(e.message));
  }
};

