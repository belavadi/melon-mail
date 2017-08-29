export default (state = {
  isOpen: false,
  isMaximized: false,
}, action) => {
  switch (action.type) {
    case 'COMPOSE_BOX_OPEN':
      return {
        ...state,
        isOpen: true,
        isMaximized: true,
        special: action.special,
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
    default:
      return state;
  }
};
