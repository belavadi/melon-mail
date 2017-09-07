export default (state = {
  isFetching: false,
  isAuthenticated: false,
  authError: '',
  registerError: '',
  stage: 'check',
  activeAccount: '',
  privateKey: null,
  publicKey: null,
  mailAddress: '',
  ethAddress: '',
  startingBlock: 0,
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
        privateKey: action.data.privateKey,
        publicKey: action.data.publicKey,
        startingBlock: action.data.startingBlock,
      };
    case 'REGISTER_ERROR':
      return {
        ...state,
        isFetching: false,
        registerError: action.error,
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isFetching: action.isFetching,
        isAuthenticated: true,
        privateKey: action.data.privateKey,
        publicKey: action.data.publicKey,
        authError: '',
      };
    case 'USER_NOT_REGISTERED':
      return {
        ...state,
        stage: action.stage,
      };
    case 'USER_IS_REGISTERED':
      return {
        ...state,
        stage: action.stage,
        startingBlock: action.data.startingBlock,
        mailAddress: action.data.mail,
        ethAddress: action.data.address,
        authError: '',
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
    case 'WRONG_NETWORK':
      return {
        ...state,
        stage: action.stage,
      };
    case 'ACCOUNT_CHANGE':
      return {
        activeAccount: action.account,
        stage: 'check',
        isAuthenticated: false,
      };
    default:
      return state;
  }
};
