export default (state = {
  isOpen: false,
  isMaximized: false,
  sendingState: 'EDITING',
}, action) => {
  switch (action.type) {
    case 'COMPOSE_BOX_OPEN':
      return {
        ...state,
        isOpen: true,
        isMaximized: true,
        special: action.special,
        sendingState: 'EDITING',
      };
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
    case 'COMPOSE_BOX_CHANGE_STATE':
      return {
        ...state,
        sendingState: action.sendingState,
      };
    default:
      return state;
  }
};
