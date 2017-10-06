import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Dropdown, Icon } from 'semantic-ui-react';
import CustomNodeModal from '../CustomNodeModal';
import * as authActions from '../../../actions/auth';
import * as utilActions from '../../../actions/utility';


const Menu = ({ mailAddress, logout, backupContacts, importContacts }) => (
  <Dropdown text={mailAddress}>
    <Dropdown.Menu>
      <CustomNodeModal />
      <Dropdown.Item onClick={backupContacts}>
        <span role="link" tabIndex="-1">
          <Icon name="cloud" /> Backup contacts
        </span>
      </Dropdown.Item>
      <Dropdown.Item onClick={importContacts}>
        <span role="link" tabIndex="-1">
          <Icon name="cloud download" /> Import contacts
        </span>
      </Dropdown.Item>
      <Dropdown.Item onClick={logout}>
        <span role="link" tabIndex="-1">
          <Icon name="log out" /> Logout
        </span>
      </Dropdown.Item>
    </Dropdown.Menu>
  </Dropdown>
);

Menu.propTypes = {
  mailAddress: PropTypes.string,
  logout: PropTypes.func.isRequired,
  backupContacts: PropTypes.func.isRequired,
  importContacts: PropTypes.func.isRequired,
};

Menu.defaultProps = {
  mailAddress: '',
};

const mapStateToProps = state => state.user;
const mapDispatchToProps = dispatch => bindActionCreators({
  logout: authActions.logout,
  backupContacts: utilActions.backupContacts,
  importContacts: utilActions.importContacts,
}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Menu);
