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

export const registerRequest = () => ({
  type: 'REGISTER_REQUEST',
  isFetching: true,
});

export const registerSuccess = jwt => ({
  type: 'REGISTER_SUCCESS',
  isFetching: false,
  jwt,
});

export const registerError = error => ({
  type: 'REGISTER_ERROR',
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

export const register = (username, password) => {
  const config = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `username=${username}&password=${password}`,
  };

  return (dispatch) => {
    dispatch(registerRequest());

    return fetch('/register', config)
      .then(response => response.json()
        .then(data => ({ data, response })))
      .then(({ data, response }) => {
        if (!response.ok) {
          return dispatch(registerError(data.message));
        }

        localStorage.setItem('jwt', data.jwt);
        return dispatch(registerSuccess(data.jwt));
      })
      .catch(err => dispatch(registerError(err)));
  };
};

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
