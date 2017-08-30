import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { List, Segment } from 'semantic-ui-react';

import * as mailActions from '../../../actions/mail';
import MailListItem from '../MailListItem';

class MailList extends Component {
  constructor(props) {
    super(props);

    this.state = {};
  }

  componentDidMount() {
    this.props.getMails(this.props.mails.folder);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.mails.folder !== this.props.mails.folder) {
      console.log(this.props.mails.folder);
      this.props.getMails(this.props.mails.folder);
    }
  }

  render() {
    return (
      <div className="mail-list">
        <Segment vertical loading={this.props.mails.isFetching} >
          <List selection divided>
            {
              this.props.mails[this.props.mails.folder].length > 0 &&
              this.props.mails[this.props.mails.folder].map(mail => (
                <MailListItem args={mail} key={mail.transactionHash} />
              ))
            }
            {
              !this.props.mails.isFetching &&
              (this.props.mails[this.props.mails.folder].length === 0) &&
              <div>
                No mails :D
              </div>
            }
          </List>
        </Segment>
      </div>
    );
  }
}

MailList.propTypes = {
  getMails: PropTypes.func.isRequired,
  mails: PropTypes.shape({
    inbox: PropTypes.array,
    outbox: PropTypes.array,
    isFetching: PropTypes.bool,
    folder: PropTypes.string,
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
