export default (state = {}, action) => {
  switch (action.type) {
    case 'MAILS_REQUEST':
      return {
        ...state,
        isFetching: true,
        thread: undefined,
      };
    case 'MAILS_SUCCESS':
      return {
        ...state,
        isFetching: false,
        mails: action.mails,
      };
    case 'MAILS_ERROR':
      return {
        ...state,
        isFetching: false,
        error: action.error,
      };
    default:
      return state;
  }
};
