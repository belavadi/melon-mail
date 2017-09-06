import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { Container, Button, Loader } from 'semantic-ui-react';
import * as composeActions from '../../../actions/compose';
import { sendMail } from '../../../actions/mail';
import { encrypt, encryptAttachments } from '../../../services/cryptoService';
import eth from '../../../services/ethereumService';

class Compose extends Component {
  constructor(props) {
    super(props);

    this.state = {
      to: '',
      subject: '',
      body: '',
      files: {
        value: '',
        files: [],
      },
      recipientExists: 'undetermined',
    };

    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSend = this.handleSend.bind(this);
    this.checkRecipient = this.checkRecipient.bind(this);
    this.resetRecipient = this.resetRecipient.bind(this);
    this.removeFile = this.removeFile.bind(this);
  }

  componentWillMount() {
    if (this.props.compose.special) {
      const originThread = this.props.mail.thread;
      const { indexInThread } = this.props.compose.special;
      const originMail = indexInThread !== undefined ?
        originThread[indexInThread] : originThread[originThread.length - 1];
      if (this.props.compose.special.type === 'reply') {
        this.setState({
          subject: `Re: ${originMail.subject}`,
          to: originMail.from,
          body: `\n-----\n${originMail.body}`,
        });
      }
      if (this.props.compose.special.type === 'forward') {
        this.setState({
          subject: `Fw: ${originMail.subject}`,
          body: `\n-----\n${originMail.body}`,
        });
      }
    }
  }

  handleInputChange(event, clean) {
    const target = event.target;
    const value = clean ? target.value.toLowerCase().trim() : target.value;
    const name = target.name;

    this.setState({
      [name]: value,
    });
  }

  removeFile(index) {
    this.setState({
      files: {
        ...this.state.files,
        files: [
          ...this.state.files.files.slice(0, index),
          ...this.state.files.files.slice(index + 1),
        ],
      },
    });
  }

  resetRecipient() {
    this.setState({ recipientExists: 'undetermined' });
  }

  checkRecipient() {
    this.setState({ recipientExists: 'loading' });
    eth._getPublicKey(this.state.to.toLowerCase().trim())
      .then(() => {
        this.setState({ recipientExists: 'true' });
      })
      .catch(() => {
        this.setState({ recipientExists: 'false' });
      });
  }

  handleSend() {
    const files = this.state.files.files;

    const mail = {
      from: this.props.user.mailAddress,
      to: this.state.to,
      subject: this.state.subject,
      body: this.state.body,
      time: new Date().toString(),
    };

    this.props.changeComposeState('ENCRYPTING_ATTACHMENTS');

    eth._getPublicKey(this.state.to)
      .then((data) => {
        const keysForReceiver = {
          privateKey: this.props.user.privateKey,
          publicKey: data.publicKey,
        };

        const keysForSender = {
          privateKey: this.props.user.privateKey,
          publicKey: this.props.user.publicKey,
        };

        const attachments = [
          encryptAttachments(files, keysForReceiver),
          encryptAttachments(files, keysForSender),
        ];

        return Promise.all(attachments)
          .then(([senderAttachments, receiverAttachments]) => {
            this.props.changeComposeState('ENCRYPTING_MAIL');
            const senderData = encrypt(keysForSender, JSON.stringify({
              ...mail,
              attachments: senderAttachments,
            }));
            const receiverData = encrypt(keysForReceiver, JSON.stringify({
              ...mail,
              attachments: receiverAttachments,
            }));
            let threadId = null;
            if (this.props.compose.special && this.props.compose.special.type === 'reply') {
              threadId = this.props.mail.threadId;
            }

            return this.props.sendMail({
              toAddress: data.address,
              senderData,
              receiverData,
            }, threadId);
          })
          .then((res) => {
            console.log(res);
            this.props.closeCompose();
          })
          .catch((err) => {
            console.log(`Error in state: ${this.props.compose.sendingState}!`);
            console.log(err);
            this.props.changeComposeState('ERROR');
          });
      })
      .catch(err => console.error(err));
  }

  render() {
    return (
      <div className="compose-wrapper">
        <Container>
          <div className="compose-header">
            New email
            <span className="header-actions">
              <Button
                compact
                basic
                inverted
                color="red"
                icon="close"
                onClick={this.props.closeCompose}
              />
            </span>
          </div>

          <div className="inputs-wrapper">
            <input
              type="text"
              name="to"
              placeholder="To"
              value={this.state.to}
              onChange={e => this.handleInputChange(e, true)}
              onFocus={this.resetRecipient}
              onBlur={this.checkRecipient}
              className={
                `${this.state.recipientExists === 'true' ? 'input-ok' : ''}
                 ${this.state.recipientExists === 'false' ? 'input-error' : ''}`
              }
            />
            <input
              type="text"
              name="subject"
              placeholder="Subject"
              value={this.state.subject}
              onChange={this.handleInputChange}
            />
            <textarea
              name="body"
              placeholder="Your message..."
              value={this.state.body}
              onChange={this.handleInputChange}
            />
            <div className="files-preview">
              {
                this.state.files.files.map((item, i) => (
                  <a className="ui label" key={item.name}>
                    <i className={`file outline icon ${item.name.split('.').pop()}`} />
                    {item.name}
                    &nbsp;-&nbsp;
                    {(item.size / 1024).toFixed(2)}kB
                    <i
                      role="button"
                      tabIndex="-1"
                      className="delete icon"
                      onClick={() => this.removeFile(i)}
                    />
                  </a>
                ))
              }
            </div>
          </div>

          <div className="compose-footer">
            <span className="status-wrapper">
              <Loader
                inline
                active={
                  this.props.compose.sendingState !== 'EDITING' &&
                  this.props.compose.sendingState !== 'ERROR'
                }
              />
              {this.props.compose.sendingState}
            </span>
            <div className="actions-wrapper">
              <div className="ui input">
                <input
                  type="file"
                  multiple
                  value={this.state.files.value}
                  onChange={(e) => {
                    this.setState({
                      files: {
                        ...e.target,
                        files: [...e.target.files],
                      },
                    });
                  }}
                />
              </div>
              <Button
                onClick={this.handleSend}
                basic
                color="green"
                content="Send"
                icon="send"
                loading={false}
                disabled={
                  this.props.compose.sendingState !== 'EDITING' &&
                  this.props.compose.sendingState !== 'ERROR'
                }
              />
            </div>
          </div>
        </Container>
      </div>
    );
  }
}

Compose.propTypes = {
  compose: PropTypes.shape({
    special: PropTypes.shape({
      type: PropTypes.string,
      indexInThread: PropTypes.number,
    }),
    sendingState: PropTypes.string.isRequired,
  }).isRequired,
  mail: PropTypes.shape({
    thread: PropTypes.array,
    threadId: PropTypes.string,
  }),
  user: PropTypes.shape({
    mailAddress: PropTypes.string.isRequired,
    ethAddress: PropTypes.string.isRequired,
    privateKey: PropTypes.string.isRequired,
    publicKey: PropTypes.string.isRequired,
  }),
  closeCompose: PropTypes.func.isRequired,
  changeComposeState: PropTypes.func.isRequired,
  sendMail: PropTypes.func.isRequired,
};

Compose.defaultProps = {
  mail: {
    thread: [],
  },
  user: {},
};

const mapStateToProps = state => state;
const mapDispatchToProps = dispatch => bindActionCreators({
  ...composeActions,
  sendMail,
}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Compose);
