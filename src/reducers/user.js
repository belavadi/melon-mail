export default (state = {
  isFetching: false,
  isAuthenticated: false,
  authError: '',
  registerError: '',
  stage: 'wallet',
  mailAddress: '',
  startingBlock: 0,
  contacts: [],
  backupDone: false,
  backupAlreadyDone: false,
  wallet: {},
}, action) => {
  switch (action.type) {
    case 'ADD_WALLET':
      return {
        ...state,
        wallet: action.wallet,
        stage: action.stage,
        error: '',
      };
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
        startingBlock: action.data.startingBlock,
        mailAddress: action.data.mailAddress,
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
        authError: '',
        isAuthenticated: true,
        isFetching: action.isFetching,
        mailAddress: action.data.mailAddress,
        startingBlock: 0,
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
        mailAddress: action.data.mailAddress,
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
    case 'UNSECURE_CONTEXT':
      return {
        ...state,
        stage: action.stage,
      };
    case 'UPDATE_BALANCE':
      return {
        ...state,
        wallet: {
          ...state.wallet,
          balance: action.balance,
        },
      };
    case 'CONTACTS_SUCCESS':
      return {
        ...state,
        contacts: action.contacts,
      };
    case 'CONTACTS_UPDATE':
      return {
        ...state,
        backupDone: true,
        contacts: action.contacts,
      };
    case 'CONTACTS_IMPORT':
      return {
        ...state,
        contacts: action.contacts,
      };
    case 'CONTACTS_BACKUP_ALREADY':
      return {
        ...state,
        backupAlreadyDone: true,
      };
    case 'RESET_BACKUP_STATE':
      return {
        ...state,
        backupAlreadyDone: false,
        backupDone: false,
      };
    default:
      return state;
  }
};
