import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import * as mailActions from '../../../actions/mail';

class MailList extends Component {
  constructor(props) {
    super(props);

    this.state = {};
  }

  render() {
    return (
      <div className="mail-list">
        <button onClick={() => mailActions.sendMail({
          to: '0x11b6c106d52f0bB8ADb75A577076D33f33FA9C40',
        })}
        >send test</button>
        <div className="list">
          <div className="item" onClick={() => this.props.fetchMail(1)} role="button" tabIndex="-1">
            <span className="title">Mail title</span>
            <div className="meta">
              <span className="from">from@email.com</span>
              <span className="date">12.3.2017</span>
            </div>
          </div>

          <div className="item" onClick={() => this.props.fetchMail(2)} role="button" tabIndex="-1">
            <span className="title">Mail title</span>
            <div className="meta">
              <span className="from">from@email.com</span>
              <span className="date">12.3.2017</span>
            </div>
          </div>

          <div className="item" onClick={() => this.props.fetchMail(3)} role="button" tabIndex="-1">
            <span className="title">Mail title</span>
            <div className="meta">
              <span className="from">from@email.com</span>
              <span className="date">12.3.2017</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

MailList.propTypes = {
  fetchMail: PropTypes.func.isRequired,
};

const mapStateToProps = state => state;
const mapDispatchToProps = dispatch => bindActionCreators({
  ...mailActions,
}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(MailList);
