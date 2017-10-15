import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
  List,
  Button,
  Dropdown,
  Modal,
  Icon,
  Form,
  Checkbox,
  Input,
  Popup,
} from 'semantic-ui-react';
import ipfs from '../../../services/ipfsService';

const options = [
  { key: 'http://', text: 'http/ws', value: 'http://' },
  { key: 'https://', text: 'https/wss', value: 'https://' },
];

class CustomNodeModal extends Component {
  constructor() {
    super();

    this.state = {
      showIp: true,
      error: '',
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
    const protocol = this.state.protocol;

    const hostNameRegExp = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9])$/;
    const ipAddressRegExp = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/;
    const portRegExp = /^([0-9]{1,4}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/;

    if (this.state.showIp && !ipAddressRegExp.test(host)) {
      this.setState({ status: 'ERROR', error: 'Invalid IP address.' });
      return;
    }

    if (!this.state.showIp && !hostNameRegExp.test(host)) {
      this.setState({ status: 'ERROR', error: 'Invalid hostname.' });
      return;
    }

    if (!portRegExp.test(wsPort) || !portRegExp.test(gatewayPort)) {
      this.setState({ status: 'ERROR', error: 'Invalid port.' });
      return;
    }

    this.setState({ status: 'TESTING_WEBSOCKET' });

    const wsTest = new WebSocket(`${protocol === 'http://' ? 'ws://' : 'wss://'}${host}:${wsPort}`);

    wsTest.onmessage = () => {
      wsTest.close();
      this.setState({ status: 'TESTING_GATEWAY' });

      const url = `${protocol}${host}:${gatewayPort}/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG/quick-start`;
      fetch(url, { method: 'get' })
        .then(() => {
          const status = ipfs.addCustomNode({
            protocol,
            host,
            wsPort,
            gatewayPort,
            id,
            connectionType: this.state.showIp ? 'ip4' : 'dns4',
          });
          if (status === 'OK') {
            document.getElementById('custom-node-form').reset();
            this.setState({
              status: '',
              nodes: JSON.parse(localStorage.getItem('customNodes')) || [],
              showIp: true,
            });
          } else {
            this.setState({ status: 'ERROR', error: status });
          }
        })
        .catch(() => {
          this.setState({ status: 'ERROR', error: 'Error connection to gateway.' });
        });
    };
    wsTest.onerror = () => {
      this.setState({ status: 'ERROR', error: 'Error connection to websocket.' });
    };
  }

  removeNode(node) {
    ipfs.removeCustomNode(node);
    this.setState({ nodes: JSON.parse(localStorage.getItem('customNodes')) || [] });
  }

  render() {
    return (
      <Modal trigger={<Dropdown.Item>
        <span><Icon name="settings" /> Custom IPFS Nodes</span>
      </Dropdown.Item>}
      >
        <Modal.Header>Add custom IPFS nodes</Modal.Header>
        <Modal.Content>
          <Form onSubmit={this.handleFormSubmit} id="custom-node-form">
            <Form.Group>
              <Form.Field>
                <Checkbox
                  radio
                  label="IP Address"
                  name="showIp"
                  checked={this.state.showIp}
                  onChange={(e, { name }) => this.setState({ [name]: true })}
                />
                <Checkbox
                  radio
                  label="DNS"
                  name="showIp"
                  checked={!this.state.showIp}
                  onChange={(e, { name }) => this.setState({ [name]: false })}
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
          <div className="ipfs-actions-wrapper">
            {this.state.status}
            {
              this.state.status === 'ERROR' &&
              <span>
                : {this.state.error}
              </span>
            }
            <Button
              onClick={this.handleFormSubmit}
              positive
              icon="add"
              content="Add"
              labelPosition="right"
              className="pull-right"
              disabled={this.state.status !== '' && this.state.status !== 'ERROR'}
            />
          </div>
          <div className="help-wrapper">
            <Popup
              trigger={<Icon color="blue" size="big" name="help circle outline" />}
              flowing
              hoverable
            >
              <h2>Help</h2>
              You can add a custom IPFS node. It will be used to bootstrap the node
              in the browser and backup the mails you send.
              <ul>
                <li>
                  Make sure your node is
                  <a
                    href="https://github.com/ipfs/js-ipfs/tree/master/examples/exchange-files-in-browser#2-make-your-daemons-listen-on-websockets"
                  >&nbsp;listening on a WebSocket
                  </a> first.
                </li>
                <li>
                  <b>Swarm WebSocket port</b> is the port you set in your config
                  (9999 in the guide above).
                </li>
                <li>
                  <b>Gateway port</b> is the port used by the IPFS gateway, AKA the public API
                  (usually 8080).
                </li>
                <li>
                  <b>Node ID</b> can be found by running <code>ipfs id</code>.
                </li>
              </ul>
              Note: if the mail service is using https, your nodes must be
              using https (and wss) too. Currently the simplest way to do this is by
              proxying traffic to your IPFS node through nginx or Apache.
              A more detailed guide can be found
              <a
                rel="noopener noreferrer"
                target="_blank"
                href="https://ipfs.decenter.com/ipfs/QmVtByCvRQsibrKy6HKtNUnxddJY3H5aVjz2djDQjnsBFz"
              >here</a>.
            </Popup>
          </div>
        </Modal.Content>
        {
          this.state.nodes.length > 0 &&
          <Modal.Actions>
            <div className="node-list">
              <List divided>
                {
                  this.state.nodes.map(node => (
                    <List.Item className="node-list-item" key={Math.random() * Date.now()}>
                      <Icon name="remove" onClick={() => this.removeNode(node)} />
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
          </Modal.Actions>
        }
      </Modal>
    );
  }
}

const mapStateToProps = state => state.user;
const mapDispatchToProps = dispatch => bindActionCreators({}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(CustomNodeModal);
