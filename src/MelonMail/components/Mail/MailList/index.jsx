import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { List } from 'semantic-ui-react';

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
        <List selection divided>
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
        </List>
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
