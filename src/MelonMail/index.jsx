/* React imports */
import React from 'react';

/* Routing / Redux / store imports */
import { HashRouter } from 'react-router-dom';

import { Route, Switch } from 'react-router';
import { Provider } from 'react-redux';
import store from './store';

/* CSS import */
import './style.scss';

/* App components import */
import App from './components/Mail/App';
import Auth from './components/Auth';
import NotFound from './components/404/';

const MelonMail = () =>
  (
    <div className="melonmail-wrapper">
      <Provider store={store}>
        <HashRouter>
          <Switch>
            <Route exact path="/" component={App} />
            <Route path="/auth" component={Auth} />
            <Route path="*" component={NotFound} />
          </Switch>
        </HashRouter>
      </Provider>
    </div>
  );

export default MelonMail;
