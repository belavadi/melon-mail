import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import Menu from '../Menu/';

const Header = ({ children, isAuthenticated }) =>
  (
    <header className="dashboard-header">
      {children}
      {
        isAuthenticated &&
        <div className="logout">
          <Menu />
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
};

Header.defaultProps = {
  children: [],
  isAuthenticated: false,
  mailAddress: '',
};

const mapStateToProps = state => state.user;
const mapDispatchToProps = dispatch => bindActionCreators({}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Header);
