import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { logout, changeAccount, changeNetwork, setAccount } from '../../actions/auth';
import { getBalance, saveLastActiveTimestamp } from '../../actions/utility';
import eth from '../../services/ethereumService';

import Auth from '../Auth/';
import App from '../Mail/App/';

class Router extends Component {
  constructor() {
    super();

    this.state = {};

    this.getCurrentInfo = this.getCurrentInfo.bind(this);
  }

  componentWillMount() {
    this.getCurrentInfo();
    setInterval(this.getCurrentInfo, 1000);
  }

  getCurrentInfo() {
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
  router: PropTypes.shape({
    path: PropTypes.string.isRequired,
  }).isRequired,
};

Router.defaultProps = {};

const mapStateToProps = state => state;
const mapDispatchToProps = dispatch => bindActionCreators({
  logout,
  changeAccount,
  getBalance,
  setAccount,
  changeNetwork,
  saveLastActiveTimestamp,
}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Router);

