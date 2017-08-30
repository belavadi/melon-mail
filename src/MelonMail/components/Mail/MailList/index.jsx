import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { List, Loader } from 'semantic-ui-react';

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
              <MailListItem args={mail} key={mail.transactionHash} />
            ))
          }
          {
            !this.props.mails.isFetching &&
            (!this.props.mails.mails ||
            this.props.mails.mails.length === 0) &&
            <div>
              No mails :D
            </div>
          }
          <div className="loader-wrapper">
            <Loader active={this.props.mails.isFetching} />
          </div>
        </List>
        <Loader />
      </div>
    );
  }
}

MailList.propTypes = {
  getMails: PropTypes.func.isRequired,
  mails: PropTypes.shape({
    mails: PropTypes.array,
    isFetching: PropTypes.bool,
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
