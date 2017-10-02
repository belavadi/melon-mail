import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Button } from 'semantic-ui-react';

import * as composeActions from '../../../actions/compose';
import * as mailActions from '../../../actions/mail';

const Sidebar = ({ openCompose, changeMailsFolder, mails }) => (
  <div className="sidebar">
    <div className="compose-button-wrapper">
      <Button compact content="Compose" onClick={() => openCompose()} />
    </div>
    <div className="nav-wrapper">
      <a
        role="link"
        tabIndex="0"
        onClick={() => changeMailsFolder('inbox')}
        className={`inbox ${mails.folder === 'inbox' ? 'active' : ''}`}
      ><span>Inbox</span></a>
      <a
        role="link"
        tabIndex="0"
        onClick={() => changeMailsFolder('outbox')}
        className={`outbox ${mails.folder === 'outbox' ? 'active' : ''}`}
      ><span>Outbox</span></a>
    </div>
  </div>
);

Sidebar.propTypes = {
  openCompose: PropTypes.func.isRequired,
  changeMailsFolder: PropTypes.func.isRequired,
  mails: PropTypes.shape({
    folder: PropTypes.string.isRequired,
  }).isRequired,
};

const mapStateToProps = state => state;
const mapDispatchToProps = dispatch => bindActionCreators({
  ...composeActions,
  ...mailActions,
}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Sidebar);
