import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Container, Grid, Segment, Header, Button, Divider } from 'semantic-ui-react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import AuthHeader from '../Mail/Header';

import * as authActions from '../../actions/auth';
import * as utilityActions from '../../actions/utility';
import * as routerActions from '../../actions/router';
import crypto from '../../services/cryptoService';

class Auth extends Component {
  constructor(props) {
    super(props);

    this.state = {};

    this.register = this.register.bind(this);
  }

  componentWillMount() {
    if (!this.props.user.isAuthenticated) {
      this.props.checkRegistration();
      this.props.getBalance();
    }
  }

  componentWillReceiveProps(nextProps) {
    const { isAuthenticated } = this.props.user;

    if (nextProps.user.isAuthenticated && isAuthenticated !== nextProps.user.isAuthenticated) {
      this.props.push('/');
    }
    if (nextProps.user.stage !== this.props.user.stage && nextProps.user.stage === 'check') {
      this.props.checkRegistration();
    }
  }

  register(e) {
    e.preventDefault();
    this.props.registerUser(this.username.value);
  }

  renderRegistration() {
    switch (this.props.user.stage) {
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
            <p>You will be prompted to sign a transaction, this mechanism will log you in.</p>
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
          <form onSubmit={this.register}>
            <Header as="h2" className="form-title">You have not registered yet!</Header>
            <Divider />
            <p>{web3.eth.accounts.length === 0 ? 'Please login to metamask first.' : ''}</p>
            {
              this.props.user.balance === 0 &&
              <div>
                <p className="regular-text">In order to create a fund, you need to have some Kovan
                  test ether in your wallet.
                  You can request k-eth on our gitter channel or on the Kovan Faucet.</p>
                <Button
                  href="https://gitter.im/melonproject/general?source=orgpage"
                  target="blank"
                  rel="noopener "
                >
                  Melon Gitter
                </Button>
                <Button
                  href="https://github.com/kovan-testnet/faucet"
                  target="blank"
                  rel="noopener "
                >
                  Kovan Faucet
                </Button>
                <Divider />
              </div>
            }

            <div className="ui right labeled input">
              <input ref={(input) => { this.username = input; }} type="text" />
              <div className="ui label">
                @melonmail.eth
              </div>
            </div>
            <p className="form-error">{this.props.user.registerError}</p>
            <Button
              disabled={web3.eth.accounts.length === 0}
              primary
              onClick={this.register}
              className="spread-button"
            >
              Register
            </Button>
          </form>
        );
      case 'noConnection':
        return (
          <div>
            <Header as="h2" className="form-title">Please install Metamask</Header>
            <Divider />
            <p className="regular-text">
              It seems like you either don&#39;t have &nbsp;
              <a href="https://metamask.io/" target="_blank" rel="noopener noreferrer">
                MetaMask </a>
              extension installed or that the extension is not connected to the Kovan test
              network.
            </p>
          </div>
        );
      case 'wrongNetwork':
        return (
          <div>
            <Header as="h2" className="form-title">You are connected to the wrong network</Header>
            <Divider />
            <p className="regular-text">
              Open MetaMask plugin and switch to Kovan Test Network.
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
    isAuthenticated: PropTypes.bool,
    isRegistered: PropTypes.bool,
    registrationDetermined: PropTypes.bool,
    authError: PropTypes.string,
    registerError: PropTypes.string,
    stage: PropTypes.string,
    balance: PropTypes.number,
  }).isRequired,
  registerUser: PropTypes.func.isRequired,
  checkRegistration: PropTypes.func.isRequired,
  getBalance: PropTypes.func.isRequired,
  push: PropTypes.func.isRequired,
};

Auth.defaultProps = {
  user: {},
  checkRegistration: () => {},
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
