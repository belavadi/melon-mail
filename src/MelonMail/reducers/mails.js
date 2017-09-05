export default (state = {
  isFetching: false,
  folder: 'inbox',
  inbox: [],
  outbox: [],
  inboxFetchedFromBlock: null,
  inboxBatchSize: 1000,
  outboxFetchedFromBlock: null,
  outboxBatchSize: 1000,
  hasMoreMails: true,
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
        inboxFetchedFromBlock: action.fetchedFromBlock,
        inboxBatchSize: state.inboxBatchSize * 2,
        inbox: [...state.inbox, ...action.mails],
      };
    case 'MAILS_OUTBOX_SUCCESS':
      return {
        ...state,
        isFetching: false,
        outboxFetchedFromBlock: action.fetchedFromBlock,
        outboxBatchSize: state.outboxBatchSize * 2,
        outbox: [...state.outbox, ...action.mails],
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
        hasMoreMails: true,
      };
    case 'MAILS_NO_MORE':
      return {
        ...state,
        hasMoreMails: false,
      };
    default:
      return state;
  }
};
