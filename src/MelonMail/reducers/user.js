export default (state = {
  isFetching: false,
  isAuthenticated: false,
  loginError: '',
  stage: 'check',
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
      };
    case 'AUTH_ERROR':
      return {
        ...state,
        isFetching: action.isFetching,
        authError: action.error,
        stage: action.stage,
      };
    default:
      return state;
  }
};
