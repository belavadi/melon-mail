import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { List, Icon } from 'semantic-ui-react';

import * as mailActions from '../../../actions/mail';
import { formatDate } from '../../../services/helperService';

const MailListItem = ({ args, getThread, mails }) => (
  <List.Item
    className="mail-list-item"
    onClick={() => getThread(args.threadId, args.blockNumber)}
    role="button"
    tabIndex="-1"
  >
    <List.Header>
      {args.subject}
    </List.Header>
    <div className="meta">
      {
        mails.folder === 'inbox' ?
          <span>{args.from}</span> :
          <span>{args.to}</span>
      }
      <span className="date">{formatDate(Date.parse(args.time))}</span>
    </div>
  </List.Item>
);

MailListItem.propTypes = {
  args: PropTypes.shape({
    from: PropTypes.string.isRequired,
    to: PropTypes.string.isRequired,
    threadId: PropTypes.string.isRequired,
    mailHash: PropTypes.string.isRequired,
    threadHash: PropTypes.string.isRequired,
  }).isRequired,
  mails: PropTypes.shape({
    folder: PropTypes.string.isRequired,
  }).isRequired,
  getThread: PropTypes.func.isRequired,
};

MailListItem.defaultProps = {
  children: [],
  isAuthenticated: false,
};

const mapStateToProps = state => state;
const mapDispatchToProps = dispatch => bindActionCreators({
  ...mailActions,
}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(MailListItem);
