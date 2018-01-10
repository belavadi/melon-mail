import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Header, Button, Divider } from 'semantic-ui-react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import * as authActions from '../../../actions/auth';

class Register extends Component {
  constructor(props) {
    super(props);

    this.state = {};

    this.register = this.register.bind(this);
  }

  register(e) {
    e.preventDefault();
    const mailAddress = `${this.username.value.toLowerCase().replace(/\s/g, '')}@${this.props.config.defaultDomain}`;

    this.props.registerUser(mailAddress);
  }

  render() {
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
  }
}

Register.propTypes = {
  user: PropTypes.shape({
    activeAccount: PropTypes.string,
    isRegisterenticated: PropTypes.bool,
    isRegistered: PropTypes.bool,
    registrationDetermined: PropTypes.bool,
    authError: PropTypes.string,
    registerError: PropTypes.string,
    stage: PropTypes.string,
    balance: PropTypes.number,
    isBeingRegistered: PropTypes.bool,
    wallet: PropTypes.object,
  }).isRequired,
  config: PropTypes.shape({
    defaultDomain: PropTypes.string.isRequired,
  }).isRequired,
  registerUser: PropTypes.func.isRequired,
};

Register.defaultProps = {
  user: {},
};

const mapStateToProps = state => state;
const mapDispatchToProps = dispatch => bindActionCreators({
  ...authActions,
}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Register);
