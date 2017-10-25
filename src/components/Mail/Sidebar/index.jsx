import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Button } from 'semantic-ui-react';

import * as composeActions from '../../../actions/compose';
import * as mailActions from '../../../actions/mail';

const Sidebar = ({ openCompose, changeMailsFolder, mails, compose, mail }) => (
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
      ><span>Inbox</span>
      </a>
      <a
        role="link"
        tabIndex="0"
        onClick={() => changeMailsFolder('outbox')}
        className={`outbox ${mails.folder === 'outbox' ? 'active' : ''}`}
      ><span>Sent</span>
      </a>
    </div>
    <div className="status-wrapper">
      {
        compose.sendingStateNumber > 0 &&
        <span className="status">{ compose.sendingState }</span>
      }
      {
        compose.sendingStateNumber < 0 &&
        <span className="status">{ compose.error }</span>
      }
      {
        compose.sendingStateNumber > 0 &&
        <span className="progress">{ (compose.sendingStateNumber * 100) / 4 }%</span>
      }
      {
        compose.sendingStateNumber > 0 &&
        <span className="progress-bar-wrapper">
          <span className="progress-bar" style={{ width: `${(compose.sendingStateNumber * 100) / 4}%` }} />
        </span>
      }
      {
        mail.showSendConfirmation &&
        <span className="status">Success!</span>
      }
    </div>
  </div>
);

Sidebar.propTypes = {
  openCompose: PropTypes.func.isRequired,
  changeMailsFolder: PropTypes.func.isRequired,
  mails: PropTypes.shape({
    folder: PropTypes.string.isRequired,
  }).isRequired,
  mail: PropTypes.shape({
    showSendConfirmation: PropTypes.bool.isRequired,
  }).isRequired,
  compose: PropTypes.shape({
    sendingState: PropTypes.string.isRequired,
    sendingStateNumber: PropTypes.number.isRequired,
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
