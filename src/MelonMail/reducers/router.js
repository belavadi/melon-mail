export default (state = {
  path: '/',
}, action) => {
  switch (action.type) {
    case 'ROUTE_CHANGE':
      return {
        ...state,
        path: action.path,
      };
    case 'ROUTE_RESET':
      return {
        ...state,
        path: '/',
      };
    default:
      return state;
  }
};
