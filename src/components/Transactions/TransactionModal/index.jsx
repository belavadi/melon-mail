import React from 'react';
import PropTypes from 'prop-types';
import { Modal, Form, Input, Button, Divider } from 'semantic-ui-react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { utils } from 'ethers';

import { closeTransactionModal } from '../../../actions/transaction';

class TransactionModal extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      gasLimit: 0,
      gasPrice: 0,
      maxUsed: 0,
    };

    this.executeTransaction = this.executeTransaction.bind(this);
  }

  async componentWillReceiveProps(nextProps) {
    console.log(nextProps);
    if (!nextProps.wallet.mailContract) return;

    const { methodName, params } = nextProps.transaction.options;
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
      console.log(gasLimit.toNumber(), utils.formatEther(gasPrice.toNumber()));
    }
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
    return (
      <div>
        <Modal
          open={this.props.transaction.isOpen}
          onClose={this.props.closeTransactionModal}
        >
          <Modal.Header>Confirm Transaction</Modal.Header>
          <Modal.Content image>
            <Modal.Description>
              <p>From: Account -&gt; To: Account</p>
              <Form>
                <Form.Group widths="equal">
                  <Form.Field>
                    <label>Gas limit:</label>
                    <Input
                      type="number"
                      placeholder="Gas limit"
                      value={this.state.gasLimit}
                      label={'Gas'}
                    />
                  </Form.Field>
                  <Form.Field>
                    <label>Gas price:</label>
                    <Input
                      type="number"
                      placeholder="Gas limit"
                      value={this.state.gasPrice}
                      label={'Gwei'}
                    />
                  </Form.Field>
                </Form.Group>
                <Form.Field>
                  <label>Max gas price: {this.state.maxUsed} {utils.etherSymbol}</label>
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
