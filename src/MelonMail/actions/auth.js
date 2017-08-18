import eth from '../services/ethereumService';

export const userNotRegistered = () => ({
  type: 'USER_NOT_REGISTERED',
});

export const userIsRegistered = () => ({
  type: 'USER_IS_REGISTERED',
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
    .then((isRegistered) => {
      if (isRegistered) {
        console.log('User registered. Should sign transaction.');
        dispatch(userIsRegistered());
        return eth.signIn();
      }

      console.log('User not registered. Go to registration');
      return dispatch(userNotRegistered());
    })
    .then((result) => {
      if (result.status) {
        dispatch(loginSuccess());
      } else {
        dispatch(loginError(result.error.toString()));
      }
    })
    .catch((error) => {
      console.log('Error: ', error);
      dispatch(authError(error.message));
      return false;
    });
};
