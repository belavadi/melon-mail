import config from '../services/config.json';

export default (state = {
  useLocalStorage: config.useLocalStorage,
  defaultDomain: config.defaultDomain,
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
