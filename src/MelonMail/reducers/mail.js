export default (state = {}, action) => {
  switch (action.type) {
    case 'MAIL_REQUEST':
      return {
        ...state,
        isFetching: true,
        thread: undefined,
      };
    case 'MAIL_SUCCESS':
      return {
        ...state,
        isFetching: false,
        thread: action.thread,
        threadId: action.threadId,
        threadHash: action.threadHash,
      };
    case 'MAIL_ERROR':
      return {
        ...state,
        isFetching: false,
        error: action.error,
      };
    default:
      return state;
  }
};
