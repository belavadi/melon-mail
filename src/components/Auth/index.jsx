import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Grid, Header, Button, Divider, Loader } from 'semantic-ui-react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import AuthHeader from '../Mail/Header';
import Wallet from './Wallet/';
import Register from './Register/';

import * as authActions from '../../actions/auth';
import * as utilityActions from '../../actions/utility';
import * as routerActions from '../../actions/router';

class Auth extends Component {
  constructor(props) {
    super(props);

    this.state = {};
  }

  componentWillMount() {
    if (!this.props.user.isAuthenticated) {
      // this.props.checkRegistration();
      // this.props.getBalance();
    }

    // this.props.startListener();
  }

  componentWillReceiveProps(nextProps) {
    const { isAuthenticated } = this.props.user;

    if (nextProps.user.isAuthenticated && isAuthenticated !== nextProps.user.isAuthenticated) {
      this.props.push('/');
    }
    if (nextProps.user.stage !== this.props.user.stage && nextProps.user.stage === 'check') {
      console.log(nextProps.user.wallet);
      this.props.checkRegistration(nextProps.user.wallet);
    }
  }

  renderRegistration() {
    if (localStorage.getItem(`isregistering-${this.props.user.activeAccount}`)) {
      return (
        <div>
          <Header as="h2" className="form-title">Your registration is being processed...</Header>
          <Divider />
          <p>Please wait while your transaction is being mined.</p>
          <Loader />
        </div>
      );
    }

    switch (this.props.user.stage) {
      case 'wallet':
        return (
          <Wallet />
        );
      case 'check':
        return (
          <div>
            <Header as="h2" className="form-title">Checking if user is registered...</Header>
            <Divider />
          </div>
        );
      case 'signIn':
        return (
          <div>
            <Header as="h2" className="form-title">Signing in...</Header>
            <Divider />
            <div className="line-divider" />
            <p>You will be prompted to sign a transaction, after which you will be logged in.</p>
          </div>
        );
      case 'authError':
        return (
          <div>
            <Header as="h2" className="form-title">There was a problem authenticating you</Header>
            <Divider />
            <p>{this.props.user.authError}</p>
            <Button primary onClick={this.props.checkRegistration}>Try again?</Button>
          </div>
        );
      case 'register':
        return (
          <Register />
        );
      case 'unsecureContext':
        return (
          <div>
            <Header as="h2" className="form-title">Unsecure context</Header>
            <Divider />
            <p className="regular-text">
              You need to be in a secure context (https or localhost).
            </p>
          </div>
        );
      default:
        return null;
    }
  }

  render() {
    return (
      <div>
        <AuthHeader />
        <Grid padded centered>
          <div className="form-wrapper">
            {this.renderRegistration()}
          </div>
        </Grid>
      </div>
    );
  }
}

Auth.propTypes = {
  user: PropTypes.shape({
    activeAccount: PropTypes.string,
    isAuthenticated: PropTypes.bool,
    isRegistered: PropTypes.bool,
    registrationDetermined: PropTypes.bool,
    authError: PropTypes.string,
    registerError: PropTypes.string,
    stage: PropTypes.string,
    balance: PropTypes.number,
    isBeingRegistered: PropTypes.bool,
    wallet: PropTypes.object,
  }).isRequired,
  checkRegistration: PropTypes.func.isRequired,
  push: PropTypes.func.isRequired,
};

Auth.defaultProps = {
  user: {},
};

const mapStateToProps = state => state;
const mapDispatchToProps = dispatch => bindActionCreators({
  ...authActions,
  ...routerActions,
  ...utilityActions,
}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Auth);
