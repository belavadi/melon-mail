import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import Auth from '../Auth/';
import App from '../Mail/App/';

const Router = ({ router }) => (
  <div className="melonmail-wrapper">
    {
      router.path === '/' &&
      <App />
    }
    {
      router.path === 'auth' &&
      <Auth />
    }
  </div>
);

Router.propTypes = {
  router: PropTypes.shape({
    path: PropTypes.string.isRequired,
  }).isRequired,
};

Router.defaultProps = {};

const mapStateToProps = state => state;
const mapDispatchToProps = dispatch => bindActionCreators({}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Router);

