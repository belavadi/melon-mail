import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { Container, Button, Loader, Search } from 'semantic-ui-react';
import { Editor, EditorState, ContentState, convertFromHTML, RichUtils } from 'draft-js';
import { stateToHTML } from 'draft-js-export-html';

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
      files: {
        value: '',
        files: [],
      },
      recipientExists: 'undetermined',
      editorState: EditorState.createEmpty(),
      selectedBlockType: '',
    };

    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSend = this.handleSend.bind(this);
    this.checkRecipient = this.checkRecipient.bind(this);
    this.resetRecipient = this.resetRecipient.bind(this);
    this.removeFile = this.removeFile.bind(this);
    this.handleEditorChange = this.handleEditorChange.bind(this);
    this.getRecipientSuggestions = this.getRecipientSuggestions.bind(this);
    this.handleKeyCommand = this.handleKeyCommand.bind(this);
  }

  componentWillMount() {
    if (this.props.compose.special) {
      const originThread = this.props.mail.thread;
      const { indexInThread } = this.props.compose.special;
      const originMail = indexInThread !== undefined ?
        originThread[indexInThread] : originThread[0];

      if (this.props.compose.special.type === 'reply') {
        this.setState({
          to: originMail.from,
          subject: `${originMail.subject}`,
        });
        if (originMail.subject.substr(0, 4) !== 'Re: ') {
          this.setState({
            subject: `Re: ${originMail.subject}`,
          });
        }
      }

      if (this.props.compose.special.type === 'forward') {
        this.setState({
          subject: `${originMail.subject}`,
        });
        if (originMail.subject.substr(0, 4) !== 'Fw: ') {
          this.setState({
            subject: `Fw: ${originMail.subject}`,
          });
        }
      }

      if (this.props.compose.special.type === 'forward') {
        this.setState({
          subject: `Fw: ${originMail.subject}`,
        });
        const bodyMarkup = `
          <p>-----<br><span>Forwarding mail from ${originMail.from}</span>
            <blockquote>${originMail.body}</blockquote>
          </p>`;
        const blocksFromHTML = convertFromHTML(bodyMarkup);
        const newContentState = ContentState.createFromBlockArray(
          [convertFromHTML('<p></p>').contentBlocks[0], ...blocksFromHTML.contentBlocks],
          [convertFromHTML('<p></p>').entityMap[0], ...blocksFromHTML.entityMap],
        );
        const newEditorState = EditorState.createWithContent(newContentState);
        this.setState({ editorState: newEditorState });
      }
    }
  }

  componentDidMount() {
    if (this.state.to !== '') this.checkRecipient();
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.to !== this.state.to) {
      this.getRecipientSuggestions();
    }
  }

  getRecipientSuggestions() {
    this.setState({
      contactSuggestions: this.props.user.contacts
        .filter(c => c.indexOf(this.state.to) !== -1)
        .map(c => ({ title: c })),
    });
  }

  handleInputChange(event, clean) {
    const target = event.target;
    const value = clean ? target.value.toLowerCase().trim() : target.value;
    const name = target.name;

    this.setState({
      [name]: value,
    });
  }

  handleEditorChange(editorState) {
    const selection = editorState.getSelection();
    const selectedBlockType = editorState
      .getCurrentContent()
      .getBlockForKey(selection.getStartKey())
      .getType();

    this.setState({
      editorState,
      selectedBlockType,
    });
  }

  handleKeyCommand(command) {
    const newState = RichUtils.handleKeyCommand(this.state.editorState, command);

    if (newState) {
      this.handleEditorChange(newState);
      return 'handled';
    }

    return 'not-handled';
  }

  handleEditorActions(action, type) {
    if (type === 'block') {
      this.handleEditorChange(
        RichUtils.toggleBlockType(this.state.editorState, action),
      );
    } else {
      this.handleEditorChange(
        RichUtils.toggleInlineStyle(this.state.editorState, action),
      );
    }
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
    const fileTooLarge = this.state.files.files.filter(file => file.size > 1024 * 1024 * 10);
    console.log(fileTooLarge);
    if (fileTooLarge.length > 0) {
      this.props.sendError('Files too large (10mb limit).');
      return;
    }
    const mail = {
      from: this.props.user.mailAddress,
      to: this.state.to,
      subject: this.state.subject ? this.state.subject : '(No subject)',
      body: stateToHTML(this.state.editorState.getCurrentContent()).toString(),
      time: new Date().toString(),
    };

    this.props.sendRequest('Fetching public key...');

    eth._getPublicKey(this.state.to)
      .then((data) => {
        const keysForSender = {
          privateKey: this.props.user.privateKey,
          publicKey: this.props.user.publicKey,
        };
        const keysForReceiver = {
          privateKey: this.props.user.privateKey,
          publicKey: data.publicKey,
        };

        if (files.length > 0) this.props.changeSendState('Encrypting attachments...');

        const attachments = [
          encryptAttachments(files, keysForSender),
          encryptAttachments(files, keysForReceiver),
        ];
        return Promise.all(attachments)
          .then(([senderAttachments, receiverAttachments]) => {
            this.props.changeSendState('Encrypting mail...');
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
          .then(() => {
            this.props.closeCompose();
          })
          .catch((err) => {
            throw err;
          });
      })
      .catch((err) => {
        console.log(`Error in state: ${this.props.compose.sendingState}!`);
        console.log(err);
        this.props.sendError('Couldn\'t fetch public key.');
      });
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
            <Search
              name="to"
              placeholder="To"
              value={this.state.to}
              icon={false}
              showNoResults={false}
              className={
                `${this.state.recipientExists === 'true' ? 'input-ok' : ''}
                 ${this.state.recipientExists === 'false' ? 'input-error' : ''}`}
              results={this.state.contactSuggestions}
              onBlur={() => setTimeout(() => this.checkRecipient(), 100)}
              onFocus={this.resetRecipient}
              onSearchChange={e => this.handleInputChange(e, true)}
              onResultSelect={(e, data) => {
                this.handleInputChange({ target: { name: 'to', value: data.result.title } });
                setTimeout(() => this.checkRecipient(), 100);
              }}
            />
            <div className="ui input">
              <input
                type="text"
                name="subject"
                placeholder="Subject"
                value={this.state.subject}
                onChange={this.handleInputChange}
              />
            </div>
            <Editor
              editorState={this.state.editorState}
              onChange={this.handleEditorChange}
              handleKeyCommand={this.handleKeyCommand}
            />
            <div className="files-preview">
              {
                this.state.files.files.map((item, i) => (
                  <a className="ui label" key={item.name}>
                    <i
                      className={`file outline icon ${item.name.split('.').pop().toLowerCase()}`}
                    />
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
            <div className="editor-actions">
              <Button.Group basic compact size="tiny">
                <Button
                  icon="bold"
                  onMouseDown={(e) => { e.preventDefault(); this.handleEditorActions('BOLD'); }}
                  active={this.state.editorState.getCurrentInlineStyle().has('BOLD')}
                />
                <Button
                  icon="italic"
                  onMouseDown={(e) => { e.preventDefault(); this.handleEditorActions('ITALIC'); }}
                  active={this.state.editorState.getCurrentInlineStyle().has('ITALIC')}
                />
                <Button
                  icon="underline"
                  onMouseDown={(e) => { e.preventDefault(); this.handleEditorActions('UNDERLINE'); }}
                  active={this.state.editorState.getCurrentInlineStyle().has('UNDERLINE')}
                />
              </Button.Group>

              <Button.Group basic compact size="tiny">
                <Button
                  icon="header"
                  content="1"
                  onMouseDown={(e) => { e.preventDefault(); this.handleEditorActions('header-one', 'block'); }}
                  active={this.state.selectedBlockType === 'header-one'}
                />
                <Button
                  icon="header"
                  content="2"
                  onMouseDown={(e) => { e.preventDefault(); this.handleEditorActions('header-two', 'block'); }}
                  active={this.state.selectedBlockType === 'header-two'}
                />
              </Button.Group>

              <Button.Group basic compact size="tiny">
                <Button
                  icon="list ul"
                  onMouseDown={(e) => { e.preventDefault(); this.handleEditorActions('unordered-list-item', 'block'); }}
                  active={this.state.selectedBlockType === 'unordered-list-item'}
                />
                <Button
                  icon="list ol"
                  onMouseDown={(e) => { e.preventDefault(); this.handleEditorActions('ordered-list-item', 'block'); }}
                  active={this.state.selectedBlockType === 'ordered-list-item'}
                />
              </Button.Group>
            </div>
          </div>

          <div className="compose-footer">
            <span className="status-wrapper">
              <Loader
                inline
                active={this.props.compose.isSending}
              />
              {
                this.props.compose.error === '' &&
                this.props.compose.sendingState
              }
              {
                this.props.compose.error !== '' &&
                this.props.compose.error
              }
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
                  (this.props.compose.error !== '') ||
                  this.state.recipientExists !== 'true'
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
    isSending: PropTypes.bool.isRequired,
    error: PropTypes.string.isRequired,
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
    contacts: PropTypes.array,
  }),
  closeCompose: PropTypes.func.isRequired,
  sendMail: PropTypes.func.isRequired,
  sendError: PropTypes.func.isRequired,
  sendRequest: PropTypes.func.isRequired,
  changeSendState: PropTypes.func.isRequired,
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
