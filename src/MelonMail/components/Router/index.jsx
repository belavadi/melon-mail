import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import { changeAccount } from '../../actions/auth';

/* Import React Components */

import Auth from '../Auth/';
import App from '../Mail/App/';

class Router extends Component {
  constructor() {
    super();

    this.state = {};
  }

  componentWillMount() {
    setInterval(() => {
      if (this.props.user.activeAccount !== web3.eth.accounts[0] && web3.eth.accounts.length > 0) {
        this.props.changeAccount(web3.eth.accounts[0]);
      }
    }, 100);
  }

  render() {
    return (
      <div className="melonmail-wrapper">
        {
          this.props.router.path === '/' &&
          <App />
        }
        {
          this.props.router.path === 'auth' &&
          <Auth />
        }
      </div>
    );
  }
}

Router.propTypes = {
  path: PropTypes.string.isRequired,
  changeAccount: PropTypes.func.isRequired,
  user: PropTypes.shape({
    activeAccount: PropTypes.string.isRequired,
  }).isRequired,
  router: PropTypes.shape({
    path: PropTypes.string.isRequired,
  }).isRequired,
};

Router.defaultProps = {
  path: 'auth',
};

const mapStateToProps = state => state;
const mapDispatchToProps = dispatch => bindActionCreators({
  changeAccount,
}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Router);

