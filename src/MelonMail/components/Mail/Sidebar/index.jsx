import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Button } from 'semantic-ui-react';

import * as composeActions from '../../../actions/compose';

const Sidebar = ({ openCompose }) => (
  <div className="sidebar">
    <div className="compose-button-wrapper">
      <Button primary basic compact content="Compose" icon="plus" onClick={openCompose} />
    </div>
    <ul>
      <li>Inbox</li>
      <li>Sent</li>
    </ul>
  </div>
);

Sidebar.propTypes = {
  openCompose: PropTypes.func.isRequired,
};

const mapStateToProps = state => state.user;
const mapDispatchToProps = dispatch => bindActionCreators({
  ...composeActions,
}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Sidebar);
