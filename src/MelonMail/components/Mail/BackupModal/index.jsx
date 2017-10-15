import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import PropTypes from 'prop-types';

import { Button, Dropdown, Modal, Icon } from 'semantic-ui-react';
import * as utilActions from '../../../actions/utility';

class BackupModal extends Component {
  constructor(props) {
    super(props);

    this.onClose = this.onClose.bind(this);
  }

  onClose() {
    this.props.backupProgressReset();
  }

  render() {
    return (
      <Modal
        trigger={<Dropdown.Item>
          <span><Icon name="cloud" /> Backup contacts</span>
        </Dropdown.Item>}
        onClose={this.onClose}
      >
        <Modal.Header>Backup contacts</Modal.Header>
        <Modal.Content>
          <div>
            <h5>Hi there, you can save your contacts permanently to the IPFS</h5>
            <ul>
              <li>
                By backing up your config they will be stored on the ipfs
              </li>
              <li>
                After backup your contacs will sync automatically every time you enter MelonMail
              </li>
            </ul>
            {
              this.props.backupAlreadyDone &&
                <h4> All contacts are already saved!</h4>
            }
            {
              this.props.backupDone &&
                <h4> Backup successful!</h4>
            }
          </div>
        </Modal.Content>
        <Modal.Actions>
          <Button
            onClick={this.props.backupContacts}
            positive
            icon="cloud download"
            content="Backup"
          />
        </Modal.Actions>
      </Modal>
    );
  }
}

BackupModal.propTypes = {
  backupContacts: PropTypes.func.isRequired,
  backupProgressReset: PropTypes.func.isRequired,
  backupDone: PropTypes.bool,
  backupAlreadyDone: PropTypes.bool,
};

BackupModal.defaultProps = {
  backupDone: false,
  backupAlreadyDone: false,
};


const mapStateToProps = state => state.user;
const mapDispatchToProps = dispatch => bindActionCreators({
  backupContacts: utilActions.backupContacts,
  backupProgressReset: utilActions.backupProgressReset,
}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(BackupModal);
