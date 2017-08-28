import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { List } from 'semantic-ui-react';

import * as mailActions from '../../../actions/mail';

const MailListItem = ({ args, fetchMail }) => (
  <List.Item
    className="mail-list-item"
    onClick={() => fetchMail(args.threadId)}
    role="button"
    tabIndex="-1"
  >
    <List.Header>Mail Title</List.Header>
    <div className="meta">
      <span className="from">{args.from}</span>
      <span className="date">12.3.2017</span>
    </div>
  </List.Item>
);

MailListItem.propTypes = {
  args: PropTypes.shape({
    from: PropTypes.string.isRequired,
    to: PropTypes.string.isRequired,
    threadId: PropTypes.string.isRequired,
    ipfsHash: PropTypes.string.isRequired,
  }).isRequired,
  fetchMail: PropTypes.func.isRequired,
};

MailListItem.defaultProps = {
  children: [],
  isAuthenticated: false,
};

const mapStateToProps = state => state.user;
const mapDispatchToProps = dispatch => bindActionCreators({
  ...mailActions,
}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(MailListItem);
