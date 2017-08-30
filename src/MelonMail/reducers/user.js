export default (state = {
  isFetching: false,
  isAuthenticated: false,
  loginError: '',
  stage: 'check',
  privateKey: null,
  publicKey: null,
  mailAddress: '',
  ethAddress: '',
}, action) => {
  switch (action.type) {
    case 'REGISTER_REQUEST':
    case 'LOGIN_REQUEST':
      return {
        ...state,
        isFetching: action.isFetching,
      };
    case 'REGISTER_SUCCESS':
      return {
        ...state,
        isFetching: action.isFetching,
        isAuthenticated: true,
        registerError: '',
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isFetching: action.isFetching,
        isAuthenticated: true,
        loginError: '',
        privateKey: action.data.privateKey,
        publicKey: action.data.publicKey,
      };
    case 'REGISTER_ERROR':
      return {
        ...state,
        isFetching: action.isFetching,
        registerError: action.registerError,
        stage: action.stage,
      };
    case 'USER_NOT_REGISTERED':
      return {
        ...state,
        stage: action.stage,
      };
    case 'USER_IS_REGISTERED':
      return {
        ...state,
        loginError: '',
        stage: action.stage,
        startingBlock: action.data.startingBlock,
        mailAddress: action.data.mail,
        ethAddress: action.data.address,
      };
    case 'AUTH_ERROR':
      return {
        ...state,
        isFetching: action.isFetching,
        authError: action.error,
        stage: action.stage,
      };
    case 'NO_CONNECTION':
      return {
        ...state,
        stage: action.stage,
      };
    default:
      return state;
  }
};
