import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { Container, Button } from 'semantic-ui-react';
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
    };

    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSend = this.handleSend.bind(this);
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

  handleInputChange(event) {
    const target = event.target;
    const value = target.value;
    const name = target.name;

    this.setState({
      [name]: value,
    });
  }

  handleSend() {
    const files = [];

    const mail = {
      from: this.props.user.mailAddress,
      to: this.state.to,
      subject: this.state.subject,
      body: this.state.body,
      time: new Date().toString(),
    };

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

        const promises = [
          encryptAttachments(files, keysForReceiver),
          encryptAttachments(files, keysForSender),
        ];

        Promise.all(promises)
          .then(([senderAttachments, receiverAttachments]) => {
            const senderMail = JSON.stringify({
              ...mail,
              attachments: senderAttachments,
            });
            const receiverMail = JSON.stringify({
              ...mail,
              attachments: receiverAttachments,
            });
            const senderData = encrypt(keysForSender, senderMail);
            const receiverData = encrypt(keysForReceiver, receiverMail);
            const threadId = this.props.compose.special.type === 'reply' ? this.props.mail.threadId : null;

            console.log(threadId);

            this.props.sendMail({
              toAddress: data.address,
              senderData,
              receiverData,
            }, threadId);
          })
          .catch((err) => {
            console.log('Error encrypting attachments!');
            console.log(err);
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
              onChange={this.handleInputChange}
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
              placeholder="Content"
              value={this.state.body}
              onChange={this.handleInputChange}
            />
          </div>

          <div className="actions-wrapper">
            <Button
              onClick={this.handleSend}
              basic
              color="green"
              content="Send"
              icon="send"
              loading={false}
            />
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
  sendMail: PropTypes.func.isRequired,
};

Compose.defaultProps = {
  mail: {
    thread: [],
  },
  user: {

  },
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
