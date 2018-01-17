import React, { Component } from 'react';
import Ethers from 'ethers';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
  Button,
  Dropdown,
  Modal,
  Icon,
  Form,
  Input,
  Popup,
  Divider,
} from 'semantic-ui-react';

const options = [
  { key: 'http://', text: 'http://', value: 'http://' },
  { key: 'https://', text: 'https://', value: 'https://' },
];

class EthereumNodeModal extends Component {
  constructor() {
    super();

    let node = localStorage.getItem('customEthNode') || { ipAddress: '', protocol: 'https://' };

    if (localStorage.getItem('customEthNode')) {
      node = JSON.parse(localStorage.getItem('customEthNode'));
    }

    this.state = {
      host: node.ipAddress,
      protocol: node.protocol,
      nodeAdded: false,
      error: false,
    };

    this.handleFormSubmit = this.handleFormSubmit.bind(this);
  }

  async handleFormSubmit(e) {
    e.preventDefault();
    const { kovan } = Ethers.providers.networks;
    const protocol = this.state.protocol;
    const ipAddress = this.state.host;

    try {
      const customNode = new Ethers.providers.JsonRpcProvider(protocol + ipAddress, kovan);
      await customNode.getBlockNumber();

      localStorage.setItem('customEthNode', JSON.stringify({ protocol, ipAddress }));

      this.setState({
        nodeAdded: true,
        error: false,
      });
    } catch (error) {
      this.setState({
        error: true,
        nodeAdded: false,
      });
    }
  }

  removeNode() {
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
                  <Input
                    ref={(input) => { this.host = input; }}
                    value={this.state.host}
                    onChange={(e, data) => this.setState({ host: data.value })}
                    label={<Dropdown
                      defaultValue="https://"
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
              hoverable
            >
              <h2>Help</h2>
              <Divider />
              We are fetching events from our own node (because of and Metamask issue).<br />
              If you don&apos;t want to trust our node you can set
              your own node in the following dialog.
            </Popup>

            {
              this.state.nodeAdded &&
              <span> Ethereum node successfuly added</span>
            }

            {
              this.state.error &&
              <span> Not a valid Ethereum node!</span>
            }

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
            />
          </div>

        </Modal.Content>
      </Modal>
    );
  }
}

const mapStateToProps = state => ({});
const mapDispatchToProps = dispatch => bindActionCreators({}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(EthereumNodeModal);
