import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { List, Button, Dropdown, Modal, Icon, Form, Checkbox, Input } from 'semantic-ui-react';
import ipfs from '../../../services/ipfsService';

const options = [
  { key: 'http://', text: 'http://', value: 'http://' },
  { key: 'https://', text: 'https://', value: 'https://' },
];

class Menu extends Component {
  constructor() {
    super();

    this.state = {
      showIp: false,
      hostError: '',
      portError: '',
      protocol: 'http://',
      nodes: JSON.parse(localStorage.getItem('customNodes')) || [],
    };
    this.handleFormSubmit = this.handleFormSubmit.bind(this);
  }

  handleFormSubmit(e) {
    e.preventDefault();

    const host = this.host.inputRef.value;
    const port = this.port.inputRef.value;

    const hostNameRegExp = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9])$/;
    const ipAddressRegExp = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/;
    const portRegExp = /^([0-9]{1,4}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/;

    if (this.state.showIp && !ipAddressRegExp.test(host)) {
      console.log('INVALID IP ADDRESS');
      return;
    }

    if (!this.state.showIp && !hostNameRegExp.test(host)) {
      console.log('INVALID HOSTNAME');
      return;
    }

    if (!portRegExp.test(port)) {
      console.log('INVALID PORT');
      return;
    }

    const connectionItem = this.state.showIp ? [`/ip4/${host}/tcp/${port}`]
      : [host, port, { protocol: this.state.protocol.split(':').unshift() }];

    ipfs.getWebsocketAddress(connectionItem)
      .then((data) => {
        console.log(data);
        const nodes = JSON.parse(localStorage.getItem('customNodes')) || [];
        nodes.push({
          protocol: this.state.protocol,
          host,
          port,
          connectionType: this.state.showIp ? 'ip4' : 'dns4',
        });
        localStorage.setItem('customNodes', JSON.stringify(nodes));
        this.setState({
          nodes,
        });
      })
      .catch(err => console.log(err));
  }

  render() {
    return (
      <Dropdown text={this.props.mailAddress}>
        <Dropdown.Menu>
          <Dropdown.Item>
            <Icon name="settings" fitted />
            <Modal trigger={<span>Custom IPFS Nodes</span>}>
              <Modal.Header>Add custom IPFS nodes</Modal.Header>
              <Modal.Content>
                <Form onSubmit={this.handleFormSubmit}>
                  <List animated verticalAlign="middle">
                    {
                      this.state.nodes.map((node, i) => (
                        <List.Item className="node-list-item" key={Math.random() * Date.now()}>
                          {`${node.protocol}${node.host}:${node.port}`}
                        </List.Item>
                      ))
                    }
                  </List>
                  <Form.Field>
                    <Checkbox
                      radio
                      label="Domain"
                      name="showIp"
                      checked={!this.state.showIp}
                      onChange={(e, { name }) => this.setState({ [name]: false })}
                    />
                  </Form.Field>
                  <Form.Field>
                    <Checkbox
                      radio
                      label="IP Address"
                      name="showIp"
                      checked={this.state.showIp}
                      onChange={(e, { name }) => this.setState({ [name]: true })}
                    />
                  </Form.Field>
                  <Form.Field>
                    {
                      !this.state.showIp &&
                      <Input
                        ref={(input) => { this.host = input; }}
                        label={<Dropdown
                          defaultValue="http://"
                          onChange={(e, data) => this.setState({ protocol: data.value })}
                          options={options}
                        />}
                        type="text"
                        placeholder="Custom IPFS Node domain"
                      />
                    }
                    {
                      this.state.showIp &&
                      <Input
                        ref={(input) => { this.host = input; }}
                        label={<Dropdown
                          defaultValue="http://"
                          onChange={(e, data) => this.setState({ protocol: data.value })}
                          options={options}
                        />}
                        type="text"
                        placeholder="Custom IPFS Node IP"
                      />
                    }
                  </Form.Field>
                  <Form.Field inline>
                    <Input
                      ref={(input) => { this.port = input; }}
                      type="text"
                      placeholder="Port"
                    />
                  </Form.Field>
                  <Button
                    onClick={this.handleFormSubmit}
                    className="save-button"
                    primary
                  >
                    Save
                  </Button>
                </Form>
              </Modal.Content>
            </Modal>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    );
  }
}

Menu.propTypes = {
  mailAddress: PropTypes.string,
};

Menu.defaultProps = {
  mailAddress: '',
};

const mapStateToProps = state => state.user;
const mapDispatchToProps = dispatch => bindActionCreators({}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Menu);
