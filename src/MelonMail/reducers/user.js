export default (state = {
  isFetching: false,
  isAuthenticated: false,
  loginError: '',
  registrationDetermined: false,
  isRegistered: false,
}, action) => {
  switch (action.type) {
    case 'REGISTER_REQUEST':
    case 'LOGIN_REQUEST':
      return {
        ...state,
        isFetching: action.isFetching,
      };
    case 'LOGIN_SUCCESS':
    case 'REGISTER_SUCCESS':
      return {
        ...state,
        isFetching: action.isFetching,
        isAuthenticated: true,
        loginError: '',
        registerError: '',
      };
    case 'LOGIN_ERROR':
      return {
        ...state,
        isFetching: action.isFetching,
        loginError: action.error,
      };
    case 'REGISTER_ERROR':
      return {
        ...state,
        isFetching: action.isFetching,
        registerError: action.registerError,
      };
    case 'USER_NOT_REGISTERED':
      return {
        ...state,
        registrationDetermined: true,
        isRegistered: false,
      };
    case 'USER_IS_REGISTERED':
      return {
        ...state,
        registrationDetermined: true,
        isRegistered: true,
        loginError: '',
        startingBlock: action.data.startingBlock,
        address: action.data.email,
      };
    case 'AUTH_ERROR':
      return {
        ...state,
        isFetching: action.isFetching,
        authError: action.error,
      };
    default:
      return state;
  }
};
