import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import * as mailActions from '../../../actions/mail';
import MailListItem from '../MailListItem';

class MailList extends Component {
  constructor(props) {
    super(props);

    this.state = {};
  }

  componentDidMount() {
    this.props.getMails('inbox');
  }

  render() {
    return (
      <div className="mail-list">
        <button onClick={() => mailActions.sendMail({
          to: '0x11b6c106d52f0bB8ADb75A577076D33f33FA9C40',
        })}
        >send test</button>
        <div className="list">
          {
            this.props.mails.mails &&
            this.props.mails.mails.length > 0 &&
            this.props.mails.mails.map(mail => (
              <MailListItem args={mail.args} key={mail.transactionHash} />
            ))
          }
          {
            (!this.props.mails.mails ||
            this.props.mails.mails.length === 0) &&
            <div>
              No mails :D
            </div>
          }
        </div>
      </div>
    );
  }
}

MailList.propTypes = {
  getMails: PropTypes.func.isRequired,
  mails: PropTypes.shape({
    mails: PropTypes.array,
  }).isRequired,
};

const mapStateToProps = state => state;
const mapDispatchToProps = dispatch => bindActionCreators({
  ...mailActions,
}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(MailList);
