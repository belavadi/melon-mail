import React, { Component } from 'react';
import { Provider } from 'react-redux';
import PropTypes from 'prop-types';
import Web3 from 'web3';
import { executeWhenReady } from './services/helperService';
import store from './store';

import Router from './components/Router/';

import './style.scss';

class MelonMail extends Component {
  constructor() {
    super();
    this.state = {
      loaded: false,
    };
  }

  componentWillMount() {
    executeWhenReady(() => {
      console.log(this.state.loaded);
      window.web3 = new Web3(web3.currentProvider);
      this.setState({
        loaded: true,
      });
    });
  }

  render() {
    if (!this.state.loaded) {
      return (
        <div>Loading...</div>
      );
    }
    console.info(web3);
    return (
      <Provider store={store}>
        <Router
          useLocalStorage={this.props.useLocalStorage}
          defaultDomain={this.props.defaultDomain}
        />
      </Provider>
    );
  }
}

MelonMail.propTypes = {
  useLocalStorage: PropTypes.bool,
  defaultDomain: PropTypes.string,
};

MelonMail.defaultProps = {
  useLocalStorage: false,
  defaultDomain: 'melonmail.eth',
};

export default MelonMail;
