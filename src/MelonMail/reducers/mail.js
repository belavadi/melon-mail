export default (state = {
  isFetching: false,
  thread: [],
  threadId: null,
  threadHash: null,
  error: '',
  showSendConfirmation: false,
}, action) => {
  switch (action.type) {
    case 'MAIL_REQUEST':
      return {
        ...state,
        isFetching: true,
        thread: [],
        threadId: action.threadId,
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
    case 'ATTACHMENT_REQUEST':
      return {
        ...state,
        thread: [
          ...state.thread.slice(0, action.mailIndex),
          {
            ...state.thread[action.mailIndex],
            attachments: [
              ...state.thread[action.mailIndex].attachments.slice(0, action.attachmentIndex),
              {
                ...state.thread[action.mailIndex].attachments[action.attachmentIndex],
                downloading: true,
              },
              ...state.thread[action.mailIndex].attachments.slice(action.attachmentIndex + 1),
            ],
          },
          ...state.thread.slice(action.mailIndex + 1),
        ],
      };
    case 'ATTACHMENT_SUCCESS':
      return {
        ...state,
        thread: [
          ...state.thread.slice(0, action.mailIndex),
          {
            ...state.thread[action.mailIndex],
            attachments: [
              ...state.thread[action.mailIndex].attachments.slice(0, action.attachmentIndex),
              action.attachment,
              ...state.thread[action.mailIndex].attachments.slice(action.attachmentIndex + 1),
            ],
          },
          ...state.thread.slice(action.mailIndex + 1),
        ],
      };
    case 'ATTACHMENT_ERROR':
      return {
        ...state,
        thread: [
          ...state.thread.slice(0, action.mailIndex),
          {
            ...state.thread[action.mailIndex],
            attachments: [
              ...state.thread[action.mailIndex].attachments.slice(0, action.attachmentIndex),
              {
                ...state.thread[action.mailIndex].attachments[action.attachmentIndex],
                downloading: false,
              },
              ...state.thread[action.mailIndex].attachments.slice(action.attachmentIndex + 1),
            ],
          },
          ...state.thread.slice(action.mailIndex + 1),
        ],
      };
    case 'COMPOSE_BOX_OPEN':
      return {
        ...state,
        thread: [],
        threadId: null,
        threadHash: null,
      };
    case 'SEND_SUCCESS':
      return {
        ...state,
        showSendConfirmation: true,
      };
    case 'SEND_SUCCESS_CLEAR':
      return {
        ...state,
        showSendConfirmation: false,
      };
    default:
      return state;
  }
};
