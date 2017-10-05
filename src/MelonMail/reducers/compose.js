export default (state = {
  isOpen: false,
  isMaximized: false,
  isSending: false,
  sendingState: '',
  sendingStateNumber: 0,
  error: '',
}, action) => {
  switch (action.type) {
    case 'COMPOSE_BOX_OPEN':
      return {
        ...state,
        isOpen: true,
        isMaximized: true,
        special: null,
        sendingState: '',
        sendingStateNumber: 0,
      };
    case 'COMPOSE_BOX_OPEN_SPECIAL':
      return {
        ...state,
        isOpen: true,
        isMaximized: true,
        special: action.special,
        sendingState: '',
        sendingStateNumber: 0,
        error: '',
      };
    case 'MAIL_REQUEST':
    case 'COMPOSE_BOX_CLOSE':
      return {
        ...state,
        isOpen: false,
        error: '',
      };
    case 'COMPOSE_BOX_SHOW':
      return {
        ...state,
        isMaximized: true,
      };
    case 'COMPOSE_BOX_HIDE':
      return {
        ...state,
        isMaximized: false,
      };
    case 'SEND_REQUEST':
      return {
        ...state,
        isSending: action.isSending,
        error: '',
      };
    case 'SEND_STATE_CHANGE':
      return {
        ...state,
        sendingState: action.sendingState,
        sendingStateNumber: action.sendingStateNumber,
      };
    case 'SEND_SUCCESS':
      return {
        ...state,
        isSending: action.isSending,
        sendingStateNumber: 0,
      };
    case 'SEND_ERROR':
      return {
        ...state,
        error: action.message,
        sendingStateNumber: -1,
        isSending: false,
      };
    default:
      return state;
  }
};
