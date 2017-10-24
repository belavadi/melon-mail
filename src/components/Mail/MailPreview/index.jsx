import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { Button, Loader, Icon } from 'semantic-ui-react';

import * as composeActions from '../../../actions/compose';
import { downloadAttachment } from '../../../actions/mail';
import { scrollTo } from '../../../actions/utility';
import { formatDate } from '../../../services/helperService';
import Compose from '../Compose';
import iconSuccess from '../../../assets/icon-success.svg';

class MailPreview extends Component {
  constructor(props) {
    super(props);

    this.state = {};
  }

  componentDidUpdate(prevProps) {
    if (this.props.mail.thread.length !== 0 &&
      (prevProps.mail.threadId !== this.props.mail.threadId ||
       prevProps.mail.thread.length !== this.props.mail.thread.length)
    ) {
      const mailWrappers = document.querySelectorAll('.mail-wrapper');
      if (mailWrappers.length) {
        document.querySelector('.mail-preview').scrollTop = mailWrappers[mailWrappers.length - 1].offsetTop - 40;
      }
    }
  }

  compose(special, mailIndex) {
    this.props.openCompose({
      type: special,
      indexInThread: mailIndex,
    });

    const mailPreviewEl = document.getElementsByClassName('mail-preview')[0];
    scrollTo(mailPreviewEl, mailPreviewEl.scrollHeight, 300);
    setTimeout(() => document.querySelector('.public-DraftEditor-content').focus(), 300);
  }

  render() {
    return (
      <div className="mail-preview-wrapper">
        {
          this.props.mail.showSendConfirmation &&
          <div className="send-confirmation">
            <img src={iconSuccess} alt="success" />
            <h1>Your mail has been sent!</h1>
          </div>
        }
        <div className={`mail-preview ${this.props.mail.showSendConfirmation ? 'hide-overflow' : ''}`}>
          {
            this.props.mail.isFetching &&
            <div className="loader-wrapper">
              <Loader active />
            </div>
          }
          {
            !this.props.mail.isFetching &&
            this.props.mail.thread.length > 0 &&
            <div className="thread-wrapper">
              {
                this.props.mail.thread[0].threadHash !== '' &&
                <div className="thread-meta">
                  <Button.Group basic>
                    <a
                      className="ui button"
                      rel="noopener noreferrer"
                      target="_blank"
                      href={`https://kovan.etherscan.io/tx/${this.props.mail.threadTransaction}`}
                    >
                      <Icon name="chain" /> Thread transaction
                    </a>
                    <a
                      className="ui button"
                      rel="noopener noreferrer"
                      target="_blank"
                      href={`https://ipfs.decenter.com/api/v0/object/get?arg=${this.props.mail.threadHash}`}
                    >
                      <Icon name="cloud" /> Thread on IPFS
                    </a>
                  </Button.Group>
                </div>
              }
              {this.props.mail.thread.map((mail, mailIndex) => (
                mail.hash &&
                <div className="mail-wrapper" key={mail.hash}>
                  <div className="title-wrapper">
                    <h1>{mail.subject}</h1>
                    <div className="mail-actions">
                      <Button.Group basic>
                        <Button
                          icon="reply"
                          content="Reply"
                          onClick={() => this.compose('reply', mailIndex)}
                        />
                        <Button
                          icon="mail forward"
                          content="Forward"
                          onClick={() => this.compose('forward', mailIndex)}
                        />
                      </Button.Group>
                    </div>
                  </div>
                  <div className="meta">
                    <span className="date">
                      {
                        mail.hash !== 'welcome' &&
                        <a
                          rel="noopener noreferrer"
                          target="_blank"
                          href={`https://ipfs.decenter.com/api/v0/cat?arg=${mail.hash}`}
                          title="Encrypted mail content on IPFS"
                        >
                          <Icon name="cloud" />
                        </a>
                      }
                      {formatDate(Date.parse(mail.time))}
                    </span>
                    <span className="from">
                      From <span className="from">{
                        mail.from !== this.props.user.mailAddress ?
                          mail.from : 'Me'
                      } </span>
                      to <span className="to">{
                        mail.to !== this.props.user.mailAddress ?
                          mail.to.join(', ') : 'Me'
                      } </span>
                    </span>
                  </div>
                  <div>
                    <div className="mail-body">
                      <p dangerouslySetInnerHTML={{ __html: mail.body }} />
                    </div>
                    <div className="attachments-wrapper">
                      {
                        mail.attachments.map((item, attachmentIndex) => (
                          <a
                            className="attachment"
                            key={item.name}
                            role="button"
                            tabIndex="-1"
                            onClick={() => {
                              this.props.downloadAttachment(item, mailIndex, attachmentIndex);
                            }}
                            data-extension={item.name.split('.').pop().toUpperCase().substr(0, 4)}
                          >
                            <span className="attachment-download-wrapper">
                              {
                                !item.downloading &&
                                <span className="download" />
                              }
                              <Loader
                                inline
                                indeterminate
                                size="medium"
                                active={item.downloading}
                              />
                            </span>
                            <span className="attachment-title">
                              {item.name}
                            </span>
                            <span className="attachment-size">
                              {(item.size / 1024).toFixed(2)}kB
                            </span>
                          </a>
                        ))
                      }
                    </div>
                  </div>
                </div>
              ))}
            </div>
          }
          {
            !this.props.mail.isFetching &&
            !this.props.mail.thread.length > 0 &&
            this.props.mail.error &&
            <div className="error-wrapper">
              <h1>Error fetching mail</h1>
              <h2>{JSON.stringify(this.props.mail.error)}</h2>
            </div>
          }
          {
            !this.props.mail.isFetching &&
            !this.props.mail.thread.length > 0 &&
            !this.props.mail.error &&
            !this.props.compose.isOpen &&
            <div className="empty-wrapper">
              <h1>No email selected</h1>
            </div>
          }
          {
            this.props.compose.isOpen &&
            <Compose />
          }
        </div>
      </div>
    );
  }
}

MailPreview.propTypes = {
  mail: PropTypes.shape({
    isFetching: PropTypes.bool,
    thread: PropTypes.array,
    threadId: PropTypes.string,
    threadHash: PropTypes.string,
    threadTransaction: PropTypes.string,
    error: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    attachments: PropTypes.array,
    showSendConfirmation: PropTypes.bool.isRequired,
  }),
  openCompose: PropTypes.func.isRequired,
  downloadAttachment: PropTypes.func.isRequired,
  user: PropTypes.shape({
    mailAddress: PropTypes.string.isRequired,
  }).isRequired,
  compose: PropTypes.shape({
    isOpen: PropTypes.bool.isRequired,
  }).isRequired,
};

MailPreview.defaultProps = {
  mail: {},
};

const mapStateToProps = state => state;
const mapDispatchToProps = dispatch => bindActionCreators({
  ...composeActions,
  downloadAttachment,
}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(MailPreview);
