import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Button } from 'semantic-ui-react';

import * as composeActions from '../../../actions/compose';
import * as mailActions from '../../../actions/mail';

const Sidebar = ({ openCompose, changeMailsFolder }) => (
  <div className="sidebar">
    <div className="compose-button-wrapper">
      <Button primary basic compact content="Compose" icon="plus" onClick={() => openCompose()} />
    </div>
    <div className="nav-wrapper">
      <a role="link" tabIndex="0" onClick={() => changeMailsFolder('inbox')}>Inbox</a>
      <a role="link" tabIndex="0" onClick={() => changeMailsFolder('outbox')}>Sent</a>
    </div>
  </div>
);

Sidebar.propTypes = {
  openCompose: PropTypes.func.isRequired,
  changeMailsFolder: PropTypes.func.isRequired,
};

const mapStateToProps = state => state.user;
const mapDispatchToProps = dispatch => bindActionCreators({
  ...composeActions,
  ...mailActions,
}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Sidebar);
