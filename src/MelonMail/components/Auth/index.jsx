import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Container, Grid, Segment, Header, Button, Divider } from 'semantic-ui-react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import * as authActions from '../../actions/auth';
import * as routerActions from '../../actions/router';
import helper from '../../services/helperService';

class Auth extends Component {
  constructor(props) {
    super(props);

    this.state = {};
  }

  componentDidMount() {
    if (!this.props.user.isAuthenticated) { helper.executeWhenReady(this.props.checkRegistration); }
  }

  componentDidUpdate() {
    if (this.props.user.isAuthenticated) {
      this.props.push('/');
    }
  }

  render() {
    return (
      <Container text>
        <Header as="h1">Auth</Header>

        <Grid centered>
          {
            !this.props.user.registrationDetermined &&
            !this.props.user.authError &&
            <div>
              <Header as="h2">Checking if user is registered...</Header>
            </div>
          }

          {
            this.props.user.registrationDetermined &&
            this.props.user.isRegistered &&
            this.props.user.loginError === '' &&
            <div>
              <Header as="h2">Signing in...</Header>
              <Header as="h3">User should authenticate (sign transaction)</Header>
            </div>
          }

          {
            !this.props.user.registrationDetermined &&
            this.props.user.authError &&
            <div>
              <Header as="h2">Authentication error</Header>
              <Header as="h3">{this.props.user.authError}</Header>
            </div>
          }

          {
            this.props.user.registrationDetermined &&
            this.props.user.isRegistered &&
            this.props.user.loginError !== '' &&
            <div>
              <Header as="h2">Sign in failed.</Header>
              <Header as="h3">{this.props.user.loginError}</Header>
            </div>
          }

          {
            this.props.user.registrationDetermined &&
            !this.props.user.isRegistered &&
            <div>
              <Header as="h2">User is not registered.</Header>
              <Header as="h3">User should register</Header>
              <Segment>
                <input type="text" />@mail.com
                <Divider />
                <Button>Register</Button>
              </Segment>
            </div>
          }
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
  }).isRequired,
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
