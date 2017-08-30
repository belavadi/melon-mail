import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

/* Import React Components */

import Auth from '../Auth/';
import App from '../Mail/App/';

const Router = ({ path }) => (
  <div className="melonmail-wrapper">
    {
      path === '/' &&
        <App />
    }
    {
      path === 'auth' &&
        <Auth />
    }
  </div>
);


Router.propTypes = {
  path: PropTypes.string.isRequired,
};

Router.defaultProps = {
  path: 'auth',
};

const mapStateToProps = state => state.router;

export default connect(
  mapStateToProps,
)(Router);

