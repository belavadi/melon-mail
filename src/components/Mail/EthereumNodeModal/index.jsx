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

const options = [
  { key: 'http://', text: 'http://', value: 'http://' },
  { key: 'https://', text: 'https://', value: 'https://' },
];

class EthereumNodeModal extends Component {
  constructor() {
    super();

    const localNodes = localStorage.getItem('customEthNode');

    this.state = {
      showIp: true,
      error: '',
      protocol: 'http://',
      nodes: localNodes || [],
      status: '',
    };
    this.handleFormSubmit = this.handleFormSubmit.bind(this);
  }

  handleFormSubmit(e) {
    e.preventDefault();

    const protocol = this.state.protocol;
    const ipAddress = this.host.inputRef.value;

    console.log(protocol, ipAddress);

    localStorage.setItem('customEthNode', protocol + ipAddress);

    // opalimo refresh
  }

  removeNode(node) {
    localStorage.removeItem('customEthNode');
  }

  render() {
    return (
      <Modal trigger={<Dropdown.Item>
        <span><Icon name="protect" /> Custom Ethereum node</span>
      </Dropdown.Item>}
      >
        <Modal.Header>Add custom Ethereum Node</Modal.Header>
        <Modal.Content>
          <Form onSubmit={this.handleFormSubmit} id="custom-node-form">

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
          </Form>
          <div className="ipfs-actions-wrapper">

            <Popup
              trigger={<Icon color="blue" size="big" name="help circle outline" />}
              flowing
              hoverable
            >
              <h2>Help</h2>
              You can add custom IPFS nodes that you trust.
              They will be added to the bootstrap nodes
              list in the browser and therefore used as additional backup option for your emails.
              Some useful tips:
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
              Note: If this Melon Mail service is served over HTTPS, the IPFS node must also be
              using HTTPS and WSS. The simplest way to do this is by
              proxying traffic to your IPFS node through nginx or Apache.
              A more detailed guide can be found <a rel="noopener noreferrer" target="_blank" href="https://ipfs.decenter.com/ipfs/QmVtByCvRQsibrKy6HKtNUnxddJY3H5aVjz2djDQjnsBFz">here</a>.
            </Popup>

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

        </Modal.Content>
        {
          this.state.nodes.length > 0 &&
          <Modal.Actions>
            <div className="node-list">
              <List divided>
                {
                  this.state.nodes.map(node => (
                    <List.Item className="node-list-item" key={Math.random() * Date.now()}>
                      <Icon name="remove" onClick={() => this.removeNode()} />
                      <List.Content>
                        <List.Header>
                          {`${node}`}
                        </List.Header>
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
)(EthereumNodeModal);
