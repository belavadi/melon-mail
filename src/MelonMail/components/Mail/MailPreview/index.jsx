import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { Card, Button, Loader } from 'semantic-ui-react';

import * as composeActions from '../../../actions/compose';
import { downloadAttachment } from '../../../actions/mail';
import { formatDate } from '../../../services/helperService';

class MailPreview extends Component {
  constructor(props) {
    super(props);

    this.state = {};
  }

  render() {
    return (
      <div className="mail-preview">
        {
          this.props.mail.isFetching &&
          <div>
            <h1>Loading</h1>
          </div>
        }
        {
          !this.props.mail.isFetching &&
          this.props.mail.thread.length > 0 &&
          <div className="thread-wrapper">
            <div className="thread-actions">
              <Button
                primary
                basic
                content="Reply"
                icon="reply"
                onClick={() => this.props.openCompose({ type: 'reply' })}
              />
              <Button
                primary
                basic
                content="Forward"
                icon="mail forward"
                onClick={() => this.props.openCompose({ type: 'forward' })}
              />
            </div>
            {this.props.mail.thread.map((mail, mailIndex) => (
              <Card fluid className="mail-wrapper" key={mail.hash}>
                <Card.Content>
                  <Card.Header>
                    <div className="mail-actions">
                      <Button
                        icon="reply"
                        onClick={() => this.props.openCompose({
                          type: 'reply',
                          indexInThread: mailIndex,
                        })}
                      />
                      <Button
                        icon="mail forward"
                        onClick={() => this.props.openCompose({
                          type: 'forward',
                          indexInThread: mailIndex,
                        })}
                      />
                    </div>
                    {mail.subject}
                  </Card.Header>
                  <Card.Description>
                    <p>From: {mail.from}</p>
                    <p>{formatDate(Date.parse(mail.time))}</p>
                    <div className="mail-content">
                      <p dangerouslySetInnerHTML={{ __html: mail.body }} />
                    </div>
                    {
                      mail.attachments.map((item, attachmentIndex) => (
                        <a
                          className="ui label"
                          key={item.name}
                          role="button"
                          tabIndex="-1"
                          onClick={() => {
                            this.props.downloadAttachment(item, mailIndex, attachmentIndex);
                          }}
                        >
                          <i className={`file outline icon ${item.name.split('.').pop()}`} />
                          {`
                          ${item.name}
                           -
                          ${(item.size / 1024).toFixed(2)}kB
                          `}
                          {
                            !item.downloading &&
                            <i role="button" tabIndex="-1" className="download icon" />
                          }
                          <Loader
                            inline
                            indeterminate
                            size="tiny"
                            active={item.downloading}
                          />
                        </a>
                      ))
                    }
                  </Card.Description>
                </Card.Content>
              </Card>
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
          <div className="empty-wrapper">
            <h1>:D</h1>
          </div>
        }
      </div>
    );
  }
}

MailPreview.propTypes = {
  mail: PropTypes.shape({
    isFetching: PropTypes.bool,
    thread: PropTypes.array,
    error: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    attachments: PropTypes.array,
  }),
  openCompose: PropTypes.func.isRequired,
  downloadAttachment: PropTypes.func.isRequired,
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
