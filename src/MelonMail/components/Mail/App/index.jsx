import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import Header from '../Header';
import Sidebar from '../Sidebar';
import MailList from '../MailList';
import MailPreview from '../MailPreview';

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {};
  }

  render() {
    // if(!this.props.user.isAuthenticated)
    //     return (<Redirect to="/auth"/>);

    return (
      <div className="app">
        <Header />
        <div className="content">
          <Sidebar />
          <MailList />
          <MailPreview />
        </div>
      </div>
    );
  }
}

const mapStateToProps = state => state;
const mapDispatchToProps = dispatch => bindActionCreators({}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(App);
