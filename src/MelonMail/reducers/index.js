import { combineReducers } from 'redux';
import { routerReducer } from 'react-router-redux';
import mail from './mail';
import user from './user';

const appReducer = combineReducers({
  user,
  mail,
  routing: routerReducer,
});

/*   Clears the store state    */
const rootReducer = (state, action) => {
  if (action.type === 'CLEAR_STORE') {
    const { routing } = state;
    return appReducer({ routing }, action);
  }

  return appReducer(state, action);
};

export default rootReducer;
