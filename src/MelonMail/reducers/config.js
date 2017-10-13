export default (state = {
  useLocalStorage: false,
  defaultDomain: 'melonmail.test',
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
