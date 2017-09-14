export default (state = {
  isFetching: false,
  showLoader: false,
  folder: 'inbox',
  inbox: [],
  outbox: [],
  inboxFetchedFromBlock: null,
  inboxBatchSize: 10000,
  outboxFetchedFromBlock: null,
  outboxBatchSize: 10000,
  hasMoreMails: true,
}, action) => {
  switch (action.type) {
    case 'MAILS_INBOX_REQUEST':
    case 'MAILS_OUTBOX_REQUEST':
      return {
        ...state,
        isFetching: true,
        showLoader: true,
      };
    case 'MAILS_INBOX_SUCCESS':
      return {
        ...state,
        isFetching: false,
        showLoader: !action.mails.length,
        inboxFetchedFromBlock: action.fetchedFromBlock,
        inboxBatchSize: state.inboxBatchSize * 2,
        inbox: action.mails,
      };
    case 'MAILS_OUTBOX_SUCCESS':
      return {
        ...state,
        isFetching: false,
        showLoader: !action.mails.length,
        outboxFetchedFromBlock: action.fetchedFromBlock,
        outboxBatchSize: state.outboxBatchSize * 2,
        outbox: action.mails,
      };
    case 'MAILS_INBOX_ERROR':
      return {
        ...state,
        isFetching: false,
        showLoader: false,
        error: action.error,
        inboxFetchedFromBlock: action.fetchedFromBlock,
        inboxBatchSize: state.inboxBatchSize * 2,
        hasMoreMails: action.fetchedFromBlock !== 0,
      };
    case 'MAILS_OUTBOX_ERROR':
      return {
        ...state,
        isFetching: false,
        showLoader: false,
        error: action.error,
        outboxFetchedFromBlock: action.fetchedFromBlock,
        outboxBatchSize: state.outboxBatchSize * 2,
        hasMoreMails: action.fetchedFromBlock !== 0,
      };
    case 'NEW_INBOX_MAIL':
      return {
        ...state,
        inbox: action.mails,
      };
    case 'NEW_OUTBOX_MAIL':
      return {
        ...state,
        outbox: action.mails,
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
        showLoader: false,
      };
    default:
      return state;
  }
};
