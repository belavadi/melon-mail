import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

const Header = ({ children, isAuthenticated, mailAddress }) => (
  <header className="dashboard-header">
    {children}
    {
      isAuthenticated &&
      <div className="logout" role="link" tabIndex="-1">
        <span>{mailAddress}</span>
        &nbsp;&nbsp;&nbsp;
        <span>Logout</span>
      </div>
    }
  </header>
);

Header.propTypes = {
  children: React.PropTypes.oneOfType([
    React.PropTypes.arrayOf(React.PropTypes.node),
    React.PropTypes.node,
  ]),
  isAuthenticated: PropTypes.bool,
  mailAddress: PropTypes.string,
};

Header.defaultProps = {
  children: [],
  isAuthenticated: false,
  mailAddress: PropTypes.string,
};

const mapStateToProps = state => state.user;
const mapDispatchToProps = dispatch => bindActionCreators({}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Header);
