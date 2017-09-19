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
      status: '',
    };
    this.handleFormSubmit = this.handleFormSubmit.bind(this);
  }

  handleFormSubmit(e) {
    e.preventDefault();

    const host = this.host.inputRef.value;
    const gatewayPort = this.gatewayPort.inputRef.value;
    const wsPort = this.wsPort.inputRef.value;
    const id = this.nodeID.inputRef.value;

    const hostNameRegExp = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9])$/;
    const ipAddressRegExp = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/;
    const portRegExp = /^([0-9]{1,4}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/;

    if (this.state.showIp && !ipAddressRegExp.test(host)) {
      this.setState({ status: 'INVALID_IP_ADDRESS' });
      return;
    }

    if (!this.state.showIp && !hostNameRegExp.test(host)) {
      this.setState({ status: 'INVALID_HOSTNAME' });
      return;
    }

    if (!portRegExp.test(wsPort) || !portRegExp.test(gatewayPort)) {
      this.setState({ status: 'INVALID_PORT' });
      return;
    }

    const status = ipfs.addCustomNode({
      protocol: this.state.protocol,
      host,
      wsPort,
      gatewayPort,
      id,
      connectionType: this.state.showIp ? 'ip4' : 'dns4',
    });
    this.setState({ status });
    if (status === 'OK') {
      this.setState({ nodes: JSON.parse(localStorage.getItem('customNodes')) || [] });
      document.getElementById('custom-node-form').reset();
    }
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
                {
                  this.state.nodes.length > 0 &&
                  <div className="node-list">
                    <List verticalAlign="middle">
                      {
                        this.state.nodes.map(node => (
                          <List.Item className="node-list-item" key={Math.random() * Date.now()}>
                            <Icon name="remove" />
                            <List.Content>
                              <List.Header>
                                {`${node.protocol}${node.host}:${node.gatewayPort}`}
                              </List.Header>
                              <List.Description>
                                {`/${node.connectionType}/${node.host}/tcp/${node.wsPort}/ws/ipfs/${node.id}`}
                              </List.Description>
                            </List.Content>
                          </List.Item>
                        ))
                      }
                    </List>
                  </div>
                }
                <Form onSubmit={this.handleFormSubmit} id="custom-node-form">
                  <Form.Group>
                    <Form.Field>
                      <Checkbox
                        radio
                        label="DNS"
                        name="showIp"
                        checked={!this.state.showIp}
                        onChange={(e, { name }) => this.setState({ [name]: false })}
                      />
                      &nbsp; &nbsp;
                      <Checkbox
                        radio
                        label="IP Address"
                        name="showIp"
                        checked={this.state.showIp}
                        onChange={(e, { name }) => this.setState({ [name]: true })}
                      />
                    </Form.Field>
                  </Form.Group>

                  <Form.Group widths="equal">
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
                          placeholder="Server address"
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
                          placeholder="Server IP address"
                        />
                      }
                    </Form.Field>
                  </Form.Group>

                  <Form.Group widths="equal">
                    <Form.Field width="3">
                      <label>Gateway port</label>
                      <Input
                        width="4"
                        ref={(input) => { this.gatewayPort = input; }}
                        placeholder="8080"
                      />
                    </Form.Field>
                    <Form.Field width="3">
                      <label>Swarm WS port</label>
                      <Input
                        width="4"
                        ref={(input) => { this.wsPort = input; }}
                        placeholder="9999"
                      />
                    </Form.Field>
                    <Form.Field width="10">
                      <label>Node ID</label>
                      <Input
                        ref={(input) => { this.nodeID = input; }}
                        placeholder="Qm ..."
                      />
                    </Form.Field>
                  </Form.Group>
                </Form>
              </Modal.Content>
              <Modal.Actions>
                { this.state.status }
                <Button
                  onClick={this.handleFormSubmit}
                  positive
                >
                  Save
                </Button>
              </Modal.Actions>
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
