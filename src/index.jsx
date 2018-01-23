import React from 'react';
import { render } from 'react-dom';

import { AppContainer } from 'react-hot-loader';

import 'semantic-ui-css/semantic.min.css';
import './style.scss';

import App from './components/App/';

render(
  <AppContainer>
    <App />
  </AppContainer>,
  document.getElementById('app'));

module.hot.accept();
