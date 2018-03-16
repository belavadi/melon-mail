import React, { Component } from 'react';
import PropTypes from 'prop-types';
import bip39 from 'bip39';
import { Wallet as EthersWallet } from 'ethers';

import {
  Header,
  Progress,
  Button,
} from 'semantic-ui-react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import eth from '../../../services/ethereumService';
import { addWallet } from '../../../actions/auth';

class Wallet extends Component {
  constructor(props) {
    super(props);

    const stage = localStorage.getItem('wallet:melon.email') !== null ? 4 : 0;

    this.state = {
      errorMessage: '',
      stage,
      percent: 0,
      wallet: {},
    };

    this.createWallet = this.createWallet.bind(this);
    this.importWallet = this.importWallet.bind(this);
    this.encryptWallet = this.encryptWallet.bind(this);
    this.decryptWallet = this.decryptWallet.bind(this);
    this.addWallet = this.addWallet.bind(this);
  }

  componentDidMount() {
  }

  async createWallet(e) {
    e.preventDefault();
    this.setState({
      wallet: await eth.createWallet(),
      stage: 1,
    });
  }

  async encryptWallet(wallet, password) {
    const encryptedWallet = await wallet.encrypt(password, (percent) => {
      const formattedPercent = (percent * 100).toFixed(0);
      if (formattedPercent > this.state.percent) {
        this.setState({
          percent: formattedPercent,
        });
      }
    });
    localStorage.setItem('wallet:melon.email', encryptedWallet);
  }

  async addWallet(e) {
    e.preventDefault();
    const password = this.createPassword.value;
    const passwordRepeat = this.createPasswordRepeat.value;
    const wallet = this.state.wallet;

    if (password !== passwordRepeat) {
      return this.setState({
        errorMessage: 'Passwords do not match.',
      });
    }
    if (password.trim() === '') {
      return this.setState({
        errorMessage: 'Please enter your password',
      });
    }
    await this.encryptWallet(wallet, password);
    this.props.addWallet(wallet);
  }

  async importWallet(e) {
    e.preventDefault();
    const mnemonic = this.phrase.value;

    if (bip39.validateMnemonic(mnemonic)) {
      const wallet = await eth.createWallet(mnemonic);
      this.setState({
        wallet,
        stage: 2,
      });
    } else {
      this.setState({
        errorMessage: 'Invalid mnemonic',
      });
    }
  }

  async decryptWallet(e) {
    e.preventDefault();
    const password = this.decryptPassword.value;
    if (password.trim() === '') {
      return this.setState({
        errorMessage: 'Please enter your password',
      });
    }
    const jsonWallet = localStorage.getItem('wallet:melon.email');
    try {
      const decryptedWallet = await new EthersWallet
        .fromEncryptedWallet(jsonWallet, password, (percent) => {
          const formattedPercent = (percent * 100).toFixed(0);
          if (formattedPercent > this.state.percent) {
            this.setState({
              percent: formattedPercent,
            });
          }
        });
      const wallet = await eth.createWallet(0, decryptedWallet);
      this.props.addWallet(wallet);
    } catch (error) {
      console.error(error);
      this.setState({
        errorMessage: 'Wrong password',
        percent: 0,
      });
    }
  }

  switchStage(stage) {
    this.setState({
      stage,
    });
  }

  render() {
    return (
      <div className="wallet-form">
        {
          this.state.stage === 0 &&
          <form>
            <Header>
              Welcome to Melon Mail!
            </Header>
            <p>Before you can set up your mail, you need to create or restore wallet.</p>
            <p>The standard bip39 is used to generate a mnemonic phrase,
              from which your wallet will be cryptographically derived.</p>
            <Button
              onClick={this.createWallet}
              basic
              color="blue"
            >
              Generate my wallet
            </Button>
            <Button
              onClick={() => { this.switchStage(3); }}
              basic
              color="blue"
            >
              Restore wallet with mnemonic
            </Button>
          </form>
        }
        {
          this.state.stage === 1 &&
          <div>
            <p>Generated mnemonic: </p>
            <p>
              <b>{this.state.wallet.mnemonic}</b>
            </p>
            <p>Your public address: </p>
            <p>
              <b>{this.state.wallet.address}</b>
            </p>
            <p className="small-text">
              <b>
                It will be impossible to recover this mnemonic phrase after this step.
                Please save it in a safe place.
              </b>
            </p>
            <Button onClick={() => { this.switchStage(2); }} basic color="blue">
              I wrote down my mnemonic phrase in a safe place.
            </Button>
          </div>
        }
        {
          this.state.stage === 2 &&
          <form onSubmit={this.addWallet}>
            <p>
              Now it is time to encrypt your wallet with a password of your choice.
              The encrypted wallet will be stored in the local storage of your browser.
            </p>
            <p>
              <b>Enter a password: Do not forget it!</b>
            </p>
            <div className="ui input">
              <input
                ref={(value) => { this.createPassword = value; }}
                type="password"
                placeholder="Password"
              />
            </div>
            <div className="ui input">
              <input
                ref={(value) => { this.createPasswordRepeat = value; }}
                type="password"
                placeholder="Repeat password"
              />
            </div>
            {
              this.state.percent > 0 &&
              <Progress
                percent={this.state.percent}
                indicating
                progress
                label={'Encrypting wallet...'}
              />
            }
            <p
              className="form-error"
            >{this.state.errorMessage}</p>
            <Button
              basic
              color="blue"
              onClick={this.addWallet}
              type="submit"
            >Encrypt my wallet</Button>
          </form>
        }
        {
          this.state.stage === 3 &&
          <form onSubmit={this.importWallet}>
            <p>Please type your 12-words mnemonic: </p>
            <div className="ui input">
              <input
                placeholder="Mnemonic phrase"
                ref={(value) => { this.phrase = value; }}
              />
            </div>
            <p
              className="form-error"
            >{this.state.errorMessage}</p>
            <Button
              basic
              color="blue"
              onClick={this.importWallet}
              type="button"
            >Import</Button>
          </form>
        }
        {
          this.state.stage === 4 &&
          <form onSubmit={this.decryptWallet}>
            <p>Please enter your password to decrypt your wallet.</p>
            <div className="ui input">
              <input
                ref={(value) => { this.decryptPassword = value; }}
                type="password"
                placeholder="Password"
              />
            </div>
            {
              this.state.percent > 0 &&
              <Progress
                percent={this.state.percent}
                indicating
                progress
                label={'Decrypting wallet...'}
              />
            }
            <p
              className="form-error"
            >{this.state.errorMessage}</p>
            <Button
              basic
              color="blue"
              type="button"
              onClick={this.decryptWallet}
            >
              Decrypt my wallet
            </Button>
          </form>
        }
      </div>
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
