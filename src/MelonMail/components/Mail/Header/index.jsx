import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import * as authActions from '../../../actions/auth';

const Header = ({ children, isAuthenticated, mailAddress, logout }) => (
  <header className="dashboard-header">
    {children}
    {
      isAuthenticated &&
      <div className="logout">
        <span>{mailAddress}</span>
        &nbsp;&nbsp;&nbsp;
        <span role="link" tabIndex="-1" onClick={logout}>Logout</span>
      </div>
    }
  </header>
);

Header.propTypes = {
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node,
  ]),
  isAuthenticated: PropTypes.bool,
  mailAddress: PropTypes.string,
  logout: PropTypes.func.isRequired,
};

Header.defaultProps = {
  children: [],
  isAuthenticated: false,
  mailAddress: '',
};

const mapStateToProps = state => state.user;
const mapDispatchToProps = dispatch => bindActionCreators({ ...authActions }, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Header);
