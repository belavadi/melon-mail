import React from 'react';
import PropTypes from 'prop-types';
import { Modal, Form, Input, Button, Divider } from 'semantic-ui-react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { utils } from 'ethers';

import { closeTransactionModal } from '../../../actions/transaction';

import config from '../../../../config/config.json';

class TransactionModal extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      gasLimit: 0,
      gasPrice: 0,
      maxUsed: 0,
      ethPrice: 0,
    };

    this.executeTransaction = this.executeTransaction.bind(this);
  }

  async componentWillMount() {
    this.setState({
      ethPrice: await this.getValOfEthInUsd(),
    });
  }

  async componentWillReceiveProps(nextProps) {
    const { methodName, params } = nextProps.transaction.options;
    const currMethodName = this.props.transaction.options.methodName;
    if (!nextProps.wallet.mailContract || methodName === currMethodName) return;

    const estimateGas = nextProps.wallet.mailContract.estimate[methodName];
    if (typeof estimateGas === 'function') {
      const estimatedLimit = await estimateGas(...params);
      const gasLimit = estimatedLimit.add(estimatedLimit.div(10));
      const gasPrice = await nextProps.wallet.mailContract.provider.getGasPrice();
      const maxUsed = utils.formatEther(gasLimit.mul(gasPrice));

      this.setState({
        gasLimit,
        maxUsed,
        gasPrice: gasPrice / (10 ** 9), // format in Gwei
      });
    }
  }

  async getValOfEthInUsd() {
    const res = await fetch('https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD&e=Coinbase');
    const data = await res.json();

    return parseFloat(data.USD);
  }

  calculateMaxUsed(gasLimit, gasPrice) {
    const bnGasPrice = utils.parseEther(utils.formatEther(gasPrice * (10 ** 9)));
    const bnGasLimit = utils.bigNumberify(gasLimit);

    return utils.formatEther(bnGasLimit.mul(bnGasPrice));
  }

  async executeTransaction() {
    const { wallet } = this.props;
    if (!wallet.mailContract) return;
    const { method, params, additionalParams } = this.props.transaction.options;

    if (typeof method === 'function') {
      const overrideOptions = {
        gasLimit: this.state.gasLimit,
        gasPrice: this.state.gasPrice,
      };

      try {
        method(wallet, params, ...additionalParams, overrideOptions);
      } catch (e) {
        return console.error(e);
      }
      this.props.closeTransactionModal();
    }
  }

  render() {
    const { address, mailContract } = this.props.wallet;

    return (
      <div>
        <Modal
          open={this.props.transaction.isOpen}
          onClose={this.props.closeTransactionModal}
        >
          <Modal.Header>Confirm Transaction</Modal.Header>
          <Modal.Content image>
            <Modal.Description>
              <p>From: &nbsp;
                <b>
                  <a
                    href={`https://${config.network === 'mainnet' ? '' : `${config.network}.`}etherscan.io/address/${address}`}
                    target="_blank"
                  >
                    {address}
                  </a>
                </b>
              </p>
              {
                mailContract &&
                <p>To: &nbsp;
                  <b>
                    <a
                      href={`https://${config.network === 'mainnet' ? '' : `${config.network}.`}etherscan.io/address/${mailContract.address}`}
                      target="_blank"
                    >
                      {mailContract.address}
                    </a>
                  </b>
                </p>
              }
              <Form>
                <Form.Group widths="equal">
                  <Form.Field>
                    <label>Gas limit:</label>
                    <Input
                      type="number"
                      placeholder="Gas limit"
                      value={this.state.gasLimit}
                      onChange={(e, data) => this.setState({
                        gasLimit: data.value,
                        maxUsed: this.calculateMaxUsed(data.value, this.state.gasPrice),
                      })}
                      label={'Gas'}
                    />
                  </Form.Field>
                  <Form.Field>
                    <label>Gas price:</label>
                    <Input
                      type="number"
                      placeholder="Gas limit"
                      value={this.state.gasPrice}
                      onChange={(e, data) => {
                        this.setState({
                          gasPrice: data.value,
                          maxUsed: this.calculateMaxUsed(this.state.gasLimit, data.value),
                        });
                      }}
                      label={'Gwei'}
                    />
                  </Form.Field>
                </Form.Group>
                <Form.Field>
                  <label>Max gas price: {this.state.maxUsed} {utils.etherSymbol}
                    &nbsp;({(this.state.maxUsed * this.state.ethPrice).toFixed(2)} $)</label>
                </Form.Field>
              </Form>
              <Divider />
              <Button.Group>
                <Button>Reject</Button>
                <Button.Or />
                <Button onClick={this.executeTransaction} positive>Execute</Button>
              </Button.Group>
            </Modal.Description>
          </Modal.Content>
        </Modal>
      </div>
    );
  }
}

TransactionModal.propTypes = {
  transaction: PropTypes.shape({
    isOpen: PropTypes.bool,
    methodName: PropTypes.string,
    options: PropTypes.object,
  }).isRequired,
  wallet: PropTypes.shape({
    mailContract: PropTypes.object,
    address: PropTypes.string,
  }),
  closeTransactionModal: PropTypes.func.isRequired,
};

TransactionModal.defaultProps = {
  wallet: {},
};

const mapStateToProps = state => ({
  transaction: state.transaction,
  wallet: state.user.wallet,
});
const mapDispatchToProps = dispatch => bindActionCreators({
  closeTransactionModal,
}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(TransactionModal);
