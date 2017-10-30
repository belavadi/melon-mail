import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import Header from '../Header';
import Sidebar from '../Sidebar';
import MailList from '../MailList';
import MailPreview from '../MailPreview';

import * as routerActions from '../../../actions/router';
import { openCompose } from '../../../actions/compose';
import { importContacts } from '../../../actions/utility';


class App extends Component {
  constructor(props) {
    super(props);

    this.state = {};
  }

  componentWillMount() {
    if (!this.props.user.isAuthenticated) {
      this.props.push('auth');
    } else {
      this.props.importContacts();
      if (document.location.hash.indexOf('mailto') >= 0) {
        const sendTo = document.location.hash.substr(7 + document.location.hash.indexOf('mailto'));
        this.props.openCompose({ type: 'sendTo', to: sendTo });
        history.replaceState('', document.title, window.location.pathname);
      }
    }
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.user.isAuthenticated !== nextProps.user.isAuthenticated) {
      this.props.push('auth');
    }
  }

  render() {
    return (
      <div className="app">
        <Header />
        <div className="content">
          <Sidebar />
          <MailList />
          <MailPreview />
        </div>
      </div>
    );
  }
}

App.propTypes = {
  user: PropTypes.shape({
    isAuthenticated: PropTypes.bool.isRequired,
  }).isRequired,
  push: PropTypes.func.isRequired,
  importContacts: PropTypes.func.isRequired,
  openCompose: PropTypes.func.isRequired,
};

const mapStateToProps = state => state;
const mapDispatchToProps = dispatch => bindActionCreators(
  {
    ...routerActions,
    openCompose,
    importContacts,
  }, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(App);
