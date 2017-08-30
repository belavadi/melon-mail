export default (state = {
  isFetching: true,
  folder: 'inbox',
  inbox: [],
  outbox: [],
}, action) => {
  switch (action.type) {
    case 'MAILS_INBOX_REQUEST':
    case 'MAILS_OUTBOX_REQUEST':
      return {
        ...state,
        isFetching: true,
      };
    case 'MAILS_INBOX_SUCCESS':
      return {
        ...state,
        isFetching: false,
        inbox: action.mails,
      };
    case 'MAILS_OUTBOX_SUCCESS':
      return {
        ...state,
        isFetching: false,
        outbox: action.mails,
      };
    case 'MAILS_INBOX_ERROR':
    case 'MAILS_OUTBOX_ERROR':
      return {
        ...state,
        isFetching: false,
        error: action.error,
      };
    case 'MAILS_FOLDER_CHANGE':
      return {
        ...state,
        folder: action.folder,
      };
    default:
      return state;
  }
};
