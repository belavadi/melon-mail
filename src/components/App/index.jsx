import { Provider } from 'react-redux';
import React, { Component } from 'react';
import Web3 from 'web3';
import Router from '../Router/';
import store from '../../store';
import { executeWhenReady } from '../../services/helperService';

class App extends Component {
  constructor() {
    super();
    this.state = {
      loaded: false,
    };
  }

  componentWillMount() {
    executeWhenReady(() => {
      try {
        this.setState({
          loaded: true,
        });
        window.web3 = new Web3(web3.currentProvider);
      } catch (e) {
        console.log(e);
      }
    });
  }

  render() {
    if (!this.state.loaded) {
      return (
        <div />
      );
    }
    return (
      <Provider store={store}>
        <Router />
      </Provider>
    );
  }
}

export default App;
