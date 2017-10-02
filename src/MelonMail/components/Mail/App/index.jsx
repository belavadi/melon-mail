import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import Header from '../Header';
import Sidebar from '../Sidebar';
import MailList from '../MailList';
import MailPreview from '../MailPreview';

import * as routerActions from '../../../actions/router';

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {};
  }

  componentWillMount() {
    if (!this.props.user.isAuthenticated) {
      this.props.push('auth');
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
};

const mapStateToProps = state => state;
const mapDispatchToProps = dispatch => bindActionCreators({ ...routerActions }, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(App);
