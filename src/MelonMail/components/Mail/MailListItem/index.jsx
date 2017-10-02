import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import * as mailActions from '../../../actions/mail';
import { humanizeDate } from '../../../services/helperService';

const MailListItem = ({ args, getThread, mails, mail }) => (
  <div
    className={`mail-list-item
      ${mail.threadId === args.threadId ? 'active' : ''}`}
    onClick={() => getThread(args.threadId, args.blockNumber)}
    role="button"
    tabIndex="-1"
  >
    <div className="meta">
      {
        args.attachments.length > 0 &&
        <span className="attachment-badge" />
      }
      {
        args.new &&
        <span className="new-badge" />
      }
    </div>
    <div className="info">
      <div className="time">{humanizeDate(Date.parse(args.time))}</div>
      <div className="mail-title">
        {args.subject}
      </div>
      {
        mails.folder === 'inbox' ?
          <div className="from">{args.from}</div> :
          <div className="to">{args.to}</div>
      }
      <div className="content">
        {
          args.body
            .replace(/&nbsp;/g, '')
            .replace(/<(?:.|\n)*?>/gm, '\n')
            .replace(/\n{2,}/g, '\n')
            .trim()
        }
      </div>
    </div>
  </div>
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
  mail: PropTypes.shape({
    threadId: PropTypes.string,
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
