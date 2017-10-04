export default (state = {
  isOpen: false,
  isMaximized: false,
  isSending: false,
  sendingState: 'Editing...',
  error: '',
}, action) => {
  switch (action.type) {
    case 'COMPOSE_BOX_OPEN':
      return {
        ...state,
        isOpen: true,
        isMaximized: true,
        special: null,
        sendingState: 'Editing...',
      };
    case 'COMPOSE_BOX_OPEN_SPECIAL':
      return {
        ...state,
        isOpen: true,
        isMaximized: true,
        special: action.special,
        sendingState: 'Editing...',
      };
    case 'MAIL_REQUEST':
    case 'COMPOSE_BOX_CLOSE':
      return {
        ...state,
        isOpen: false,
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
      };
    case 'SEND_STATE_CHANGE':
      return {
        ...state,
        sendingState: action.sendingState,
      };
    case 'SEND_SUCCESS':
      return {
        ...state,
        isSending: action.isSending,
      };
    case 'SEND_ERROR':
      return {
        ...state,
        error: action.message,
      };
    default:
      return state;
  }
};
