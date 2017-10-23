import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { Button, Search, Dropdown } from 'semantic-ui-react';
import { Editor, EditorState, ContentState, convertFromHTML, RichUtils } from 'draft-js';
import { stateToHTML } from 'draft-js-export-html';

import * as composeActions from '../../../actions/compose';
import { sendMail } from '../../../actions/mail';
import { contactsSuccess } from '../../../actions/auth';
import { updateContacts, saveContacts } from '../../../actions/utility';
import { encrypt, encryptAttachments } from '../../../services/cryptoService';
import eth from '../../../services/ethereumService';

class Compose extends Component {
  constructor(props) {
    super(props);

    const recepients = props.user.contacts.map(c => ({
      text: c,
      value: c,
    }));

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
      recepients,
      selectedRecepients: [],
    };

    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSend = this.handleSend.bind(this);
    this.checkRecipient = this.checkRecipient.bind(this);
    this.resetRecipient = this.resetRecipient.bind(this);
    this.removeFile = this.removeFile.bind(this);
    this.handleEditorChange = this.handleEditorChange.bind(this);
    this.getRecipientSuggestions = this.getRecipientSuggestions.bind(this);
    this.handleKeyCommand = this.handleKeyCommand.bind(this);
    this.handleAddition = this.handleAddition.bind(this);
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
        .sort((a, b) => a.indexOf(this.state.to) - b.indexOf(this.state.to))
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

  checkRecipient(recipient, callback) {
    const username = recipient.toLowerCase().trim() || this.state.to.toLowerCase().trim();
    const domain = username.split('@')[1];
    const isExternalMail = domain !== this.props.config.defaultDomain;

    eth.resolveUser(username, domain, isExternalMail)
      .then(() => {
        this.setState({ recipientExists: 'true' });
        if (callback) callback(true);
      })
      .catch(() => {
        // this.setState({ recipientExists: 'false' });
        if (callback) callback(false);
      });
  }

  saveContact(contactName) {
    // removes the null chars from the end of the string
    const currMail = this.props.user.mailAddress.replace(/\0/g, '');

    // don't save our own email in contacts list
    if (currMail === contactName) {
      return;
    }

    const mailHash = web3.sha3(this.props.user.mailAddress);

    this.props.saveContacts(contactName, mailHash);
  }

  handleSend() {
    const files = this.state.files.files;
    const fileTooLarge = this.state.files.files.filter(file => file.size > 1024 * 1024 * 10);
    const domain = this.state.selectedRecepients[0].split('@')[1];
    const isExternalMail = domain !== this.props.config.defaultDomain;

    if (fileTooLarge.length > 0) {
      this.props.sendError('Files too large (10mb limit).');
      return;
    }
    const mail = {
      from: this.props.user.mailAddress,
      to: this.state.selectedRecepients,
      subject: this.state.subject ? this.state.subject : '(No subject)',
      body: stateToHTML(this.state.editorState.getCurrentContent()).toString(),
      time: new Date().toString(),
    };

    this.props.sendRequest('Fetching public key...');

    const resolveUserPromises = this.state.selectedRecepients.map(r =>
      eth.resolveUser(r, domain, isExternalMail));

    Promise.all(resolveUserPromises)
      .then((data) => {
        const keysForSender = {
          privateKey: this.props.user.privateKey,
          publicKey: this.props.user.publicKey,
        };

        const receiversKeys = data.map(d => ({
          privateKey: this.props.user.privateKey,
          publicKey: d.publicKey,
        }));

        const attachments = [
          encryptAttachments(files, keysForSender),
          ...receiversKeys.map(key => encryptAttachments(files, key)),
        ];

        return Promise.all(attachments)
          .then(([senderAttachments, receiverAttachments]) => {
            console.log(senderAttachments, receiverAttachments);

            const senderData = encrypt(keysForSender, JSON.stringify({
              ...mail,
              attachments: senderAttachments,
            }));

            const receiversData = {};

            receiversKeys.forEach((elem) => {
              receiversData[elem.publicKey] = (encrypt(elem, JSON.stringify({
                ...mail,
                attachments: senderAttachments,
              })));
            });

            let threadId = null;
            if (this.props.compose.special && this.props.compose.special.type === 'reply') {
              threadId = this.props.mail.threadId;
            }

            return this.props.sendMail({
              toAddress: data.map(d => d.address),
              senderData,
              receiversData,
            }, threadId, data.externalMailContract);
          })
          .then(() => {
            this.props.closeCompose();
          })
          .catch((err) => {
            throw err;
          });
      });

    // eth.resolveUser(this.state.to, domain, isExternalMail)
    //   .then((data) => {
    //     if (this.props.user.contacts.indexOf(this.state.to) === -1) {
    //       this.props.contactsSuccess([
    //         this.state.to,
    //         ...this.props.user.contacts,
    //       ]);
    //     }

    //     const keysForSender = {
    //       privateKey: this.props.user.privateKey,
    //       publicKey: this.props.user.publicKey,
    //     };
    //     const keysForReceiver = {
    //       privateKey: this.props.user.privateKey,
    //       publicKey: data.publicKey,
    //     };

    //     if (files.length > 0) this.props.changeSendState('Encrypting attachments...', 2);

    //     const attachments = [
    //       encryptAttachments(files, keysForSender),
    //       encryptAttachments(files, keysForReceiver),
    //     ];
    //     return Promise.all(attachments)
    //       .then(([senderAttachments, receiverAttachments]) => {
    //         this.props.changeSendState('Encrypting mail...', 1);
    //         const senderData = encrypt(keysForSender, JSON.stringify({
    //           ...mail,
    //           attachments: senderAttachments,
    //         }));
    //         const receiverData = encrypt(keysForReceiver, JSON.stringify({
    //           ...mail,
    //           attachments: receiverAttachments,
    //         }));
    //         let threadId = null;
    //         if (this.props.compose.special && this.props.compose.special.type === 'reply') {
    //           threadId = this.props.mail.threadId;
    //         }

    //         return this.props.sendMail({
    //           toAddress: data.address,
    //           senderData,
    //           receiverData,
    //         }, threadId, data.externalMailContract);
    //       })
    //       .then(() => {
    //         this.props.closeCompose();
    //       })
    //       .catch((err) => {
    //         throw err;
    //       });
    //   })
    //   .catch((err) => {
    //     console.log(`Error in state: ${this.props.compose.sendingState}!`);
    //     console.log(err);
    //     // this.props.sendError('Couldn\'t fetch public key.');
    //     this.props.sendError(err.message.toString());
    //   });
  }

  handleAddition(e, { value }) {
    console.log(value);

    this.checkRecipient(value, (validRecipient) => {
      if (validRecipient) {
        this.setState({
          recepients: [{ text: value, value }, ...this.state.recepients],
          selectedRecepients: [...this.state.selectedRecepients, value],
        });

        // add the contact to the list
        if (this.props.user.contacts.indexOf(value) === -1) {
          this.props.contactsSuccess([
            value,
            ...this.props.user.contacts,
          ]);
        }

        this.saveContact(value);
      }
    });
  }

  render() {
    return (
      <div className="compose-wrapper">

        <Dropdown
          placeholder="To"
          options={this.state.recepients}
          fluid
          multiple
          search
          selection
          allowAdditions
          onChange={this.handleInputChange}
          onAddItem={this.handleAddition}
        />

        <div className="inputs-wrapper">
          {/* <Search
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
          /> */}

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
                onMouseDown={(e) => {
                  e.preventDefault();
                  this.handleEditorActions('BOLD');
                }}
                active={this.state.editorState.getCurrentInlineStyle().has('BOLD')}
              />
              <Button
                icon="italic"
                onMouseDown={(e) => {
                  e.preventDefault();
                  this.handleEditorActions('ITALIC');
                }}
                active={this.state.editorState.getCurrentInlineStyle().has('ITALIC')}
              />
              <Button
                icon="underline"
                onMouseDown={(e) => {
                  e.preventDefault();
                  this.handleEditorActions('UNDERLINE');
                }}
                active={this.state.editorState.getCurrentInlineStyle().has('UNDERLINE')}
              />
            </Button.Group>

            <Button.Group basic compact size="tiny">
              <Button
                className="header-button"
                icon="header"
                content="1"
                onMouseDown={(e) => {
                  e.preventDefault();
                  this.handleEditorActions('header-one', 'block');
                }}
                active={this.state.selectedBlockType === 'header-one'}
              />
              <Button
                className="header-button"
                icon="header"
                content="2"
                onMouseDown={(e) => {
                  e.preventDefault();
                  this.handleEditorActions('header-two', 'block');
                }}
                active={this.state.selectedBlockType === 'header-two'}
              />
            </Button.Group>

            <Button.Group basic compact size="tiny">
              <Button
                icon="list ul"
                onMouseDown={(e) => {
                  e.preventDefault();
                  this.handleEditorActions('unordered-list-item', 'block');
                }}
                active={this.state.selectedBlockType === 'unordered-list-item'}
              />
              <Button
                icon="list ol"
                onMouseDown={(e) => {
                  e.preventDefault();
                  this.handleEditorActions('ordered-list-item', 'block');
                }}
                active={this.state.selectedBlockType === 'ordered-list-item'}
              />
            </Button.Group>
          </div>
        </div>

        <div className="compose-footer">
          <div className="actions-wrapper">
            <Button
              className="send-button"
              onClick={this.handleSend}
              primary
              size="big"
              content="Send"
              loading={this.props.compose.isSending}
              disabled={
                this.state.recipientExists !== 'true' ||
                this.props.compose.isSending
              }
            />

            <label htmlFor="attachments" className="attachment-button" />
            <input
              type="file"
              multiple
              id="attachments"
              value={this.state.files.value}
              onChange={(e) => {
                this.setState({
                  files: {
                    ...e.target,
                    files: [
                      ...e.target.files,
                      ...this.state.files.files,
                    ],
                  },
                });
              }}
            />

            <button
              className="trash-button"
              size="big"
              onClick={this.props.closeCompose}
            />
          </div>
          <span className="status-wrapper">
            {
              this.props.compose.error !== '' &&
              <span className="error">{this.props.compose.error}</span>
            }
          </span>
        </div>
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
  config: PropTypes.shape({
    defaultDomain: PropTypes.string.isRequired,
  }).isRequired,
  closeCompose: PropTypes.func.isRequired,
  sendMail: PropTypes.func.isRequired,
  sendError: PropTypes.func.isRequired,
  sendRequest: PropTypes.func.isRequired,
  // changeSendState: PropTypes.func.isRequired,
  contactsSuccess: PropTypes.func.isRequired,
  saveContacts: PropTypes.func.isRequired,
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
  contactsSuccess,
  updateContacts,
  saveContacts,
}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Compose);
