import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Button, Header, Modal, Icon, Dropdown } from 'semantic-ui-react';
import * as composeActions from '../../../actions/compose';

class AboutModal extends Component {
  constructor(props) {
    super(props);
    this.state = { isOpen: false };
    this.open = this.open.bind(this);
    this.close = this.close.bind(this);
  }

  open() { this.setState({ isOpen: true }); }
  close() { this.setState({ isOpen: false }); }

  render() {
    return (
      <Modal
        open={this.state.isOpen}
        trigger={
          <Dropdown.Item onClick={this.open}>
            <span><Icon name="info" /> About</span>
          </Dropdown.Item>
        }
        onOpen={this.open}
        onClose={this.close}
      >
        <Modal.Header>About</Modal.Header>
        <Modal.Content>
          <Modal.Description>
            <Header>Melon Mail</Header>
            <p>Made by Decenter, 2017.</p>
            <p><a
              href="https://github.com/DecenterApps/MelonMail"
              rel="noopener noreferrer"
              target="_blank"
            >GitHub</a></p>
          </Modal.Description>
        </Modal.Content>
        <Modal.Actions>
          <Button
            positive
            content="Send Feedback"
            onClick={() => {
              this.props.sendMailTo('decenter@melon-mail.eth', 'Feedback');
              this.close();
            }}
          />
        </Modal.Actions>
      </Modal>
    );
  }
}


AboutModal.propTypes = {
  sendMailTo: PropTypes.func.isRequired,
};

const mapStateToProps = state => state;
const mapDispatchToProps = dispatch => bindActionCreators({
  ...composeActions,
}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(AboutModal);
