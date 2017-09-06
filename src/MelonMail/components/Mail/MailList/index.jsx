import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { List, Loader } from 'semantic-ui-react';
import InfiniteScroll from 'react-infinite-scroller';

import * as mailActions from '../../../actions/mail';
import MailListItem from '../MailListItem';

class MailList extends Component {
  constructor(props) {
    super(props);

    this.state = {};
  }

  componentDidMount() {
    // this.props.getMails(this.props.mails.folder);
    this.props.listenForMails();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.mails.folder !== this.props.mails.folder) {
      console.log(this.props.mails.folder);
      // this.props.getMails(this.props.mails.folder);
    }
  }

  render() {
    return (
      <div className="mail-list">
        <InfiniteScroll
          hasMore={!this.props.mails.isFetching && this.props.mails.hasMoreMails}
          useWindow={false}
          loadMore={() => this.props.getMails(this.props.mails.folder)}
          threshold={50}
        >
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
        </InfiniteScroll>
        {
          this.props.mails.showLoader &&
          <div className="loader-wrapper">
            <Loader inline active={this.props.mails.showLoader} />
          </div>
        }
      </div>
    );
  }
}

MailList.propTypes = {
  getMails: PropTypes.func.isRequired,
  listenForMails: PropTypes.func.isRequired,
  mails: PropTypes.shape({
    inbox: PropTypes.array,
    outbox: PropTypes.array,
    isFetching: PropTypes.bool,
    showLoader: PropTypes.bool,
    folder: PropTypes.string,
    hasMoreMails: PropTypes.bool,
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
