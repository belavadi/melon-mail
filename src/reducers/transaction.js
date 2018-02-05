export default (state = {
  isOpen: false,
  options: {
    method: () => {},
    methodName: '',
    params: [],
    additionalParams: [],
  },
}, action) => {
  switch (action.type) {
    case 'OPEN_TRANSACTION_MODAL':
      return {
        ...state,
        isOpen: true,
        options: action.options,
      };
    case 'CLOSE_TRANSACTION_MODAL':
      return {
        ...state,
        isOpen: false,
      };
    default:
      return state;
  }
};
