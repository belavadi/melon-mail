/* React imports */
import React from 'react';

/* Redux / store imports */
import { Provider } from 'react-redux';
import store from './store';

/* CSS import */
import './style.scss';

/* App components import */
import Router from './components/Router/';

const MelonMail = () =>
  (
    <Provider store={store}>
      <Router />
    </Provider>
  );

export default MelonMail;
