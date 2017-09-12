export default (state = {
  useLocalStorage: false,
  defaultDomain: 'melonmail.eth',
}, action) => {
  switch (action.type) {
    case 'INITIAL_SETUP':
      return {
        ...state,
        ...action.config,
      };
    default:
      return state;
  }
};
