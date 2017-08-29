/* React imports */
import React from 'react';

/* Redux / store imports */
import { Provider } from 'react-redux';
import store from './store';

/* CSS import */
import './style.scss';

/* App components import */
import Router from './components/Router/';

class MelonMail extends React.Component {
  constructor() {
    super();
    this.state = {
      loaded: false,
    };
  }

  componentWillMount() {
    window.onload = () => {
      this.setState({
        loaded: true,
      });
    };
  }

  render() {
    if (!this.state.loaded) {
      return (
        <div>Loading...</div>
      );
    }

    return (
      <Provider store={store}>
        <Router />
      </Provider>
    );
  }
}

export default MelonMail;
