import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { Button } from 'semantic-ui-react';
import { Editor, EditorState, ContentState, convertFromHTML, RichUtils } from 'draft-js';
import { stateToHTML } from 'draft-js-export-html';
import { Creatable } from 'react-select';
import { utils } from 'ethers';
import uniqBy from 'lodash/uniqBy';

import * as composeActions from '../../../actions/compose';
import { sendMail } from '../../../actions/mail';
import { contactsSuccess } from '../../../actions/auth';
import { saveContactsToLocalStorage } from '../../../actions/utility';
import { encrypt, encryptAttachments } from '../../../services/cryptoService';
import eth from '../../../services/ethereumService';

class Compose extends Component {
  constructor(props) {
    super(props);

    const recepients = props.user.contacts.map(contact => ({
      label: contact,
      value: contact,
    }));

    this.state = {
      selectedRecepients: [],
      recepients,
      subject: '',
      files: {
        value: '',
        files: [],
      },
      recipientExists: false,
      editorState: EditorState.createEmpty(),
      selectedBlockType: '',
      search: '',
      anchor: null,
    };

    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSend = this.handleSend.bind(this);
    this.checkRecipient = this.checkRecipient.bind(this);
    this.resetRecipient = this.resetRecipient.bind(this);
    this.removeFile = this.removeFile.bind(this);
    this.handleEditorChange = this.handleEditorChange.bind(this);
    this.handleKeyCommand = this.handleKeyCommand.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
  }

  componentWillMount() {
    if (this.props.compose.special) {
      if (this.props.compose.special.type === 'sendTo') {
        const to = this.props.compose.special.to;
        this.setState({
          recepients: [
            ...this.state.recepients,
            { label: to, value: to }],
          selectedRecepients: [{ label: to, value: to }],
          subject: this.props.compose.special.title || '',
        });

        return;
      }

      const originThread = this.props.mail.thread;
      const { indexInThread } = this.props.compose.special;
      const originMail = indexInThread !== undefined ?
        originThread[indexInThread] : originThread[0];

      if (this.props.compose.special.type === 'reply') {
        this.setState({
          recepients: [...this.state.recepients,
            { label: originMail.from, value: originMail.from }],
          selectedRecepients: [
            { label: originMail.from, value: originMail.from }],
          subject: `${originMail.subject}`,
          recipientExists: true,
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

      if (this.props.compose.special.type === 'replyAll') {
        const updatedRecepients = [this.state.recepients,
          ...originMail.to.map(contact =>
            ({ label: contact, value: contact })),
          { label: originMail.from, value: originMail.from }];

        let selectedRecepients = [...originMail.to].map(contact =>
          ({ label: contact, value: contact }));
        selectedRecepients = uniqBy([
          { label: originMail.from, value: originMail.from },
          ...selectedRecepients,
        ], 'value');

        this.setState({
          recepients: updatedRecepients,
          selectedRecepients,
          subject: `${originMail.subject}`,
          recipientExists: true,
        });

        if (originMail.subject.substr(0, 4) !== 'Re: ') {
          this.setState({
            subject: `Re: ${originMail.subject}`,
          });
        }
      }
    }
  }

  handleInputChange(event, clean) {
    const target = event.target;
    let value = '';

    if (target.value) {
      value = clean ? target.value.toLowerCase().trim() : target.value;
    } else {
      value = target.innerText;
    }
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
    this.setState({ recipientExists: false });
  }

  async checkRecipient(recipient, callback) {
    if (recipient === undefined) return;
    const username = recipient.toLowerCase().trim();
    const domain = username.split('@')[1];
    const wallet = this.props.user.wallet;
    const isExternalMail = domain !== this.props.config.defaultDomain;

    try {
      await eth.resolveUser(wallet, username, domain, isExternalMail);
      this.setState({ recipientExists: true });
      if (callback) callback(true);
    } catch (e) {
      if (callback) callback(false);
    }
  }

  saveContact(contactName) {
    // removes the null chars from the end of the string
    const { keccak256, toUtf8Bytes } = utils;
    const currentMail = this.props.user.mailAddress.replace(/\0/g, '');
    if (currentMail === contactName) return;

    const mailHash = keccak256(toUtf8Bytes(this.props.user.mailAddress));

    this.props.saveContactsToLocalStorage(contactName, mailHash);
  }

  async handleSend() {
    const { wallet } = this.props.user;
    const files = this.state.files.files;
    const fileTooLarge = this.state.files.files.filter(file => file.size > 1024 * 1024 * 10);
    const invalidRecepients = this.state.selectedRecepients.filter(recipient => recipient.invalid);

    if (fileTooLarge.length > 0) {
      this.props.sendError('Files too large (10mb limit).');
      return;
    }

    if (invalidRecepients.length > 0) {
      this.props.sendError('All recipients must be valid registered users.');
      return;
    }

    const recepients = this.state.selectedRecepients.map(item => item.value);

    const mail = {
      from: this.props.user.mailAddress,
      to: recepients,
      subject: this.state.subject ? this.state.subject : '(No subject)',
      body: stateToHTML(this.state.editorState.getCurrentContent()).toString(),
      time: new Date().toString(),
    };

    this.props.sendRequest('Fetching public key...');

    const resolveUserPromises = recepients.map(r =>
      eth.resolveUser(wallet, r, r.split('@')[1], r.split('@')[1] !== this.props.config.defaultDomain));

    const resolvedUsers = await Promise.all(resolveUserPromises);
    const keysForSender = {
      privateKey: wallet.privateKey,
      publicKey: wallet.publicKey,
    };

    const receiversKeys = resolvedUsers.map(user => ({
      privateKey: wallet.privateKey,
      publicKey: user.publicKey,
    }));

    const attachments = [
      encryptAttachments(files, keysForSender),
      ...receiversKeys.map(key => encryptAttachments(files, key)),
    ];

    if (files.length > 0) this.props.changeSendState('Encrypting attachments...', 2);
    try {
      const resolvedAttachments = await Promise.all(attachments);
      const [senderAttachments, ...receiverAttachments] = resolvedAttachments;

      const senderData = encrypt(keysForSender, JSON.stringify({
        ...mail,
        attachments: senderAttachments,
      }));
      const receiversData = {};

      receiversKeys.forEach((receiverKey, i) => {
        receiversData[receiverKey.publicKey] = encrypt(receiverKey, JSON.stringify({
          ...mail,
          attachments: receiverAttachments[i],
        }));
      });

      let threadId = null;
      if (this.props.compose.special && (this.props.compose.special.type === 'reply'
          || this.props.compose.special.type === 'replyAll')) {
        threadId = this.props.mail.threadId;
      }

      await this.props.sendMail({
        toAddress: resolvedUsers.map(d => d.address),
        senderData,
        receiversData,
      }, threadId, resolvedUsers.externalMailContract);

      this.props.closeCompose();
    } catch (e) {
      this.props.sendError(e.message);
    }
  }

  handleChange(values) {
    if (values.length === 0) {
      this.resetRecipient();
      return this.setState({
        selectedRecepients: [],
      });
    }

    const recepient = values[values.length - 1] || '';

    return this.checkRecipient(recepient.value, (validRecipient) => {
      if (validRecipient && !this.state.selectedRecepients.includes(recepient.value)) {
        this.setState({
          selectedRecepients: values,
        });

        // add the contact to the list
        if (this.props.user.contacts.indexOf(recepient.value) === -1) {
          this.props.contactsSuccess([
            recepient.value,
            ...this.props.user.contacts,
          ]);

          this.saveContact(recepient.value);
        }
      } else {
        const invalidValues = values;
        invalidValues[invalidValues.length - 1].invalid = true;
        this.setState({
          recepients: this.state.recepients.slice(1),
          selectedRecepients: invalidValues,
        });
        this.handleInvalidValue(invalidValues);
      }
    });
  }

  handleInvalidValue(values) {
    const indexes = values
      .map((item, i) => (item.invalid ? i : null))
      .filter(item => item !== null);

    const selectValues = document.getElementsByClassName('Select-value');
    for (let i = 0; i < selectValues.length; i += 1) {
      if (indexes.includes(i) && selectValues[i].className.indexOf('error') < 0) {
        selectValues[i].className += ' error';
      }
    }
  }

  handleBlur(event) {
    if (event.target.value.trim() === '') return;
    this.handleChange([
      ...this.state.selectedRecepients,
      { label: event.target.value, value: event.target.value },
    ]);
    const alterableEvent = event;
    alterableEvent.target.value = '';
    this.to.select.handleInputChange(alterableEvent);
  }

  render() {
    return (
      <div className="compose-wrapper">
        <Creatable
          placeholder="To"
          ref={(input) => { this.to = input; }}
          multi
          autoFocus
          onBlur={this.handleBlur}
          onBlurResetsInput={false}
          options={this.state.recepients}
          value={this.state.selectedRecepients}
          onChange={this.handleChange}
          shouldKeyDownEventCreateNewOption={({ keyCode }) =>
            [32, 13, 9, 188].indexOf(keyCode) >= 0
          }
          promptTextCreator={label => `Add recipient ${label}`}
        />

        <div className="inputs-wrapper">
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
                this.state.recipientExists !== true ||
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
      to: PropTypes.string,
      title: PropTypes.string,
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
    wallet: PropTypes.object.isRequired,
    contacts: PropTypes.array,
  }),
  config: PropTypes.shape({
    defaultDomain: PropTypes.string.isRequired,
  }).isRequired,
  closeCompose: PropTypes.func.isRequired,
  sendMail: PropTypes.func.isRequired,
  sendError: PropTypes.func.isRequired,
  sendRequest: PropTypes.func.isRequired,
  changeSendState: PropTypes.func.isRequired,
  contactsSuccess: PropTypes.func.isRequired,
  saveContactsToLocalStorage: PropTypes.func.isRequired,
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
  saveContactsToLocalStorage,
}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Compose);
