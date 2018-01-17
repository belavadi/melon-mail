import React, { Component } from 'react';
import PropTypes from 'prop-types';
import bip39 from 'bip39';
import { Grid, Divider, Button } from 'semantic-ui-react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import eth from '../../../services/ethereumService';
import { addWallet } from '../../../actions/auth';

class Wallet extends Component {
  constructor(props) {
    super(props);

    this.state = {};

    this.createWallet = this.createWallet.bind(this);
    this.importWallet = this.importWallet.bind(this);
  }

  componentDidMount() {
  }

  async createWallet() {
    this.props.addWallet(await eth.createWallet());
  }

  async importWallet(e) {
    e.preventDefault();
    const mnemonic = this.phrase.value;

    if (bip39.validateMnemonic(mnemonic)) {
      this.props.addWallet(await eth.createWallet(mnemonic));
    } else {
      console.error('Invalid mnemonic');
    }
  }

  render() {
    return (
      <Grid padded centered>
        <Grid.Row>
          <Button onClick={this.createWallet}>Create new account</Button>
        </Grid.Row>
        <Divider />
        <Grid.Row>
          <form>
            <textarea
              placeholder="Mnemonic phrase"
              ref={(value) => { this.phrase = value; }}
              rows="5"
              cols="40"
            />
            <br />
            <Button onClick={this.importWallet}>Import account</Button>
          </form>
        </Grid.Row>
      </Grid>
    );
  }
}

Wallet.propTypes = {
  addWallet: PropTypes.func.isRequired,
};

Wallet.defaultProps = {
  user: {},
};

const mapStateToProps = state => state;
const mapDispatchToProps = dispatch => bindActionCreators({
  addWallet,
}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Wallet);
