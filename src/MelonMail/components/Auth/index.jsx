import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Container, Grid, Segment, Header, Button, Divider } from 'semantic-ui-react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import * as authActions from '../../actions/auth';
import * as routerActions from '../../actions/router';
import helper from '../../services/helperService';
import crypto from '../../services/cryptoService';

class Auth extends Component {
  constructor(props) {
    super(props);

    this.state = {};

    this.register = this.register.bind(this);
  }

  componentDidMount() {
    if (!this.props.user.isAuthenticated) {
      helper.executeWhenReady(this.props.checkRegistration);
    }
    console.log(crypto);
  }

  componentDidUpdate() {
    if (this.props.user.isAuthenticated) {
      this.props.push('/');
    }
  }

  register() {
    this.props.registerUser(this.username.value);
  }

  renderRegistration() {
    switch (this.props.user.stage) {
      case 'check':
        return (
          <div>
            <Header as="h2">Checking if user is registered...</Header>
          </div>
        );
      case 'signIn':
        return (
          <div>
            <Header as="h2">Signing in...</Header>
            <Header as="h3">User should authenticate (sign transaction)</Header>
          </div>
        );
      case 'authError':
        return (
          <div>
            <Header as="h2">Authentication error</Header>
            <Header as="h3">{this.props.user.authError}</Header>
            <Button onClick={this.props.checkRegistration}>Try again?</Button>
          </div>
        );
      case 'register':
        return (
          <div>
            <Header as="h2">User is not registered.</Header>
            <Header as="h3">User should register</Header>
            <Segment>
              <input ref={(input) => { this.username = input; }} type="text" />@mail.com
              <Divider />
              <Button onClick={this.register}>Register</Button>
            </Segment>
          </div>
        );
      case 'noConnection':
        return (
          <div>
            <Segment>
              <p className="regular-text">
                It seems like you either don&#39;t have
                <a href="https://metamask.io/" target="_blank" rel="noopener noreferrer">
                  MetaMask </a>
                extension installed or that the extension is not connected to the Kovan test
                network.
              </p>
            </Segment>
          </div>
        );
      default:
        return null;
    }
  }

  render() {
    return (
      <Container text>
        <Header as="h1">Auth</Header>

        <Grid centered>
          {this.renderRegistration()}
        </Grid>


      </Container>
    );
  }
}

Auth.propTypes = {
  user: PropTypes.shape({
    isAuthenticated: PropTypes.bool,
    isRegistered: PropTypes.bool,
    registrationDetermined: PropTypes.bool,
    authError: PropTypes.string,
    loginError: PropTypes.string,
    stage: PropTypes.string,
  }).isRequired,
  registerUser: PropTypes.func.isRequired,
  checkRegistration: PropTypes.func.isRequired,
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
}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Auth);
