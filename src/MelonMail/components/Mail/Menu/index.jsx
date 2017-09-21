import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Dropdown, Icon } from 'semantic-ui-react';
import CustomNodeModal from '../CustomNodeModal';
import * as authActions from '../../../actions/auth';


const Menu = ({ mailAddress, logout }) => (
  <Dropdown text={mailAddress}>
    <Dropdown.Menu>
      <CustomNodeModal />
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
};

Menu.defaultProps = {
  mailAddress: '',
};

const mapStateToProps = state => state.user;
const mapDispatchToProps = dispatch => bindActionCreators({
  logout: authActions.logout,
}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Menu);
