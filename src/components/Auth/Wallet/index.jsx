import React, { Component } from 'react';
import PropTypes from 'prop-types';
import bip39 from 'bip39';
import {
  Input,
  Divider,
  Progress,
  Button,
  Popup,
} from 'semantic-ui-react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import eth from '../../../services/ethereumService';
import { addWallet } from '../../../actions/auth';

class Wallet extends Component {
  constructor(props) {
    super(props);

    this.state = {
      errorMessage: '',
      stage: 0,
      percent: 0,
    };

    this.createWallet = this.createWallet.bind(this);
    this.importWallet = this.importWallet.bind(this);
  }

  componentDidMount() {
  }

  async createWallet(e) {
    e.preventDefault();
    const password = this.createPassword.value;
    if (password.trim() === '') {
      this.setState({
        errorMessage: 'Please enter your password',
      });
    } else {
      const wallet = await eth.createWallet();
      const encryptedWallet = await wallet.encrypt(password, (percent) => {
        const formattedPercent = (percent * 100).toFixed(0);
        if (formattedPercent > this.state.percent) {
          this.setState({
            percent: formattedPercent,
          });
        }
      });
      this.props.addWallet(wallet);
      localStorage.setItem('wallet:melon.email', encryptedWallet);
    }
  }

  async importWallet(e) {
    e.preventDefault();
    const mnemonic = this.phrase.value;

    if (bip39.validateMnemonic(mnemonic)) {
      this.props.addWallet(await eth.createWallet(mnemonic));
    } else {
      this.setState({
        errorMessage: 'Invalid mnemonic',
      });
    }
  }

  switchStage(stage) {
    this.setState({
      stage,
    });
  }

  render() {
    console.log(this.state);
    return (
      <div>
        {
          this.state.stage === 0 &&
          <form>
            <Popup
              trigger={
                <div className="ui input">
                  <input
                    ref={(value) => { this.createPassword = value; }}
                    type="password"
                    className="form-input"
                    placeholder="Password"
                  />
                </div>
              }
              wide
              on="focus"
              content="We use this password to encrypt your wallet and keep it safe!
            Make sure you pick a strong password and remember it."
            />
            {
              this.state.percent > 0 &&
              <Progress percent={this.state.percent} indicating progress label={'Creating wallet'} />
            }
            <p
              className="form-error"
            >{this.state.errorMessage}</p>
            <Button onClick={this.createWallet}>Create new account</Button>
            <a
              onClick={() => { this.switchStage(1); }}
              role="button"
              tabIndex="-1"
              className="form-wallet-url"
            >Already have an account? Import wallet.</a>
          </form>
        }
        {
          this.state.stage === 1 &&
          <form>
            <Input
              fluid
              placeholder="Mnemonic phrase"
              ref={(value) => { this.phrase = value; }}
            />
            <p
              className="form-error"
            >{this.state.errorMessage}</p>
            <Button onClick={this.importWallet}>Import account</Button>
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
