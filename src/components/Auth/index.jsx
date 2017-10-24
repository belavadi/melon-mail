import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Grid, Header, Button, Divider } from 'semantic-ui-react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import AuthHeader from '../Mail/Header';

import * as authActions from '../../actions/auth';
import * as utilityActions from '../../actions/utility';
import * as routerActions from '../../actions/router';
import downloadButton from './assets/download-metamask.png';

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
    this.props.registerUser(`${this.username.value.toLowerCase().replace(/\s/g, '')}@${this.props.config.defaultDomain}`);
  }

  renderRegistration() {
    if (this.props.user.activeAccount === '' && this.props.user.stage === 'authError') {
      return (
        <div>
          <Header as="h2" className="form-title">Please log in to metamask first.</Header>
          <Divider />
          <p>You need to open your metamask extension and log in.</p>
        </div>
      );
    }

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
          <form onSubmit={this.register}>
            <Header as="h2" className="form-title no-divider">
              Welcome to Melon Mail!
            </Header>
            <p className="regular-text">It appears that you haven&apos;t created an account yet. To
              begin, please choose a desired username.</p>
            <Divider />
            {
              this.props.user.balance === 0 &&
              <div>
                <Header as="h4">Insufficient balance</Header>
                <p className="regular-text">In order to create an account, you need to have some
                  Kovan test ether in your wallet.
                  You can request k-eth on our gitter channel or on the Kovan Faucet.</p>
                <Button
                  href="https://gitter.im/melonproject/general?source=orgpage"
                  target="blank"
                  rel="noopener"
                >
                  Melon Gitter
                </Button>
                <Button
                  href="https://github.com/kovan-testnet/faucet"
                  target="blank"
                  rel="noopener"
                >
                  Kovan Faucet
                </Button>
              </div>
            }
            {
              this.props.user.balance !== 0 &&
              <div>
                <div className="ui right labeled input">
                  <input ref={(input) => { this.username = input; }} type="text" />
                  <div className="ui label">
                    @{this.props.config.defaultDomain}
                  </div>
                </div>
                <p className="form-error">{this.props.user.registerError}</p>
                <Button
                  disabled={this.props.user.activeAccount === '' || this.props.user.balance === 0}
                  primary
                  onClick={this.register}
                  className="spread-button"
                >
                  Register
                </Button>
              </div>
            }
          </form>
        );
      case 'noConnection':
        return (
          <div>
            <Header as="h2" className="form-title">Please install Metamask</Header>
            <Divider />
            <p className="regular-text">
              It seems like you don&#39;t have&nbsp;
              <a href="https://metamask.io/" target="_blank" rel="noopener noreferrer">MetaMask </a>
              extension installed.
              <a
                href="https://metamask.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="href"
              >
                <img className="download-metamask" src={downloadButton} alt="Download metamask" />
              </a>
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
            <Button primary onClick={this.props.checkRegistration}>Try again?</Button>
          </div>
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
  }).isRequired,
  config: PropTypes.shape({
    defaultDomain: PropTypes.string.isRequired,
  }).isRequired,
  registerUser: PropTypes.func.isRequired,
  checkRegistration: PropTypes.func.isRequired,
  getBalance: PropTypes.func.isRequired,
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
