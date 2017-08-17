import { combineReducers } from 'redux';
import mail from './mail';
import user from './user';
import router from './router';

const appReducer = combineReducers({
  user,
  mail,
  router,
});

/*   Clears the store state    */
const rootReducer = (state, action) => {
  if (action.type === 'CLEAR_STORE') {
    return appReducer({}, action);
  }

  return appReducer(state, action);
};

export default rootReducer;
