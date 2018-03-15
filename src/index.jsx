import React from 'react';
import { render } from 'react-dom';
import 'babel-polyfill';

import { AppContainer } from 'react-hot-loader';

import './style.scss';
import App from './components/App/';

render(
  <AppContainer>
    <App />
  </AppContainer>,
  document.getElementById('app'));

module.hot.accept();
