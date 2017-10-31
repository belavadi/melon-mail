import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { logout, changeAccount, fetchContacts, setAccount } from '../../actions/auth';
import { getBalance, saveLastActiveTimestamp } from '../../actions/utility';
import eth from '../../services/ethereumService';

import Auth from '../Auth/';
import App from '../Mail/App/';

class Router extends Component {
  constructor() {
    super();

    this.state = {};
  }

  componentWillMount() {
    setInterval(() => {
      eth.getAccount()
        .then((account) => {
          if (this.props.user.activeAccount !== account && account) {
            if (this.props.user.activeAccount !== '') {
              this.props.logout();
              this.props.getBalance();
              this.props.changeAccount(account);
              this.props.saveLastActiveTimestamp();
            }
          }
          if (this.props.user.activeAccount === '') {
            this.props.setAccount(account);
          }
        })
        .catch(() => {
          console.log('Log in to metamask.');
        });
    }, 500);
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
  user: PropTypes.shape({
    activeAccount: PropTypes.string.isRequired,
  }).isRequired,
  router: PropTypes.shape({
    path: PropTypes.string.isRequired,
  }).isRequired,
  logout: PropTypes.func.isRequired,
  changeAccount: PropTypes.func.isRequired,
  getBalance: PropTypes.func.isRequired,
  setAccount: PropTypes.func.isRequired,
  saveLastActiveTimestamp: PropTypes.func.isRequired,
};

Router.defaultProps = {
};

const mapStateToProps = state => state;
const mapDispatchToProps = dispatch => bindActionCreators({
  logout,
  changeAccount,
  fetchContacts,
  getBalance,
  setAccount,
  saveLastActiveTimestamp,
}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Router);

