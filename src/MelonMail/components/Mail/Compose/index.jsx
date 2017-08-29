import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { Container, Button } from 'semantic-ui-react';
import * as composeActions from '../../../actions/compose';

class Compose extends Component {
  constructor(props) {
    super(props);

    this.state = {
      to: '',
      title: '',
      body: '',
    };

    this.handleInputChange = this.handleInputChange.bind(this);
  }

  componentWillMount() {
    if (this.props.compose.special) {
      const originThread = this.props.mail.thread;
      const { indexInThread } = this.props.compose.special;
      const originMail = indexInThread !== undefined ?
        originThread[indexInThread] : originThread[originThread.length - 1];
      if (this.props.compose.special.type === 'reply') {
        this.setState({
          title: `Re: ${originMail.title}`,
          to: originMail.from,
          body: `\n-----\n${originMail.body}`,
        });
      }
      if (this.props.compose.special.type === 'forward') {
        this.setState({
          title: `Fw: ${originMail.title}`,
          body: `\n-----\n${originMail.body}`,
        });
      }
    }
  }

  handleInputChange(event) {
    const target = event.target;
    const value = target.value;
    const name = target.name;

    this.setState({
      [name]: value,
    });
  }

  render() {
    return (
      <div className="compose-wrapper">
        <Container>
          <div className="compose-header">
            New email
            <span className="header-actions">
              <Button
                compact
                basic
                inverted
                color="red"
                icon="close"
                onClick={this.props.closeCompose}
              />
            </span>
          </div>

          <div className="inputs-wrapper">
            <input
              type="text"
              name="to"
              placeholder="To"
              value={this.state.to}
              onChange={this.handleInputChange}
            />
            <input
              type="text"
              name="title"
              placeholder="Title"
              value={this.state.title}
              onChange={this.handleInputChange}
            />
            <textarea
              name="body"
              placeholder="Content"
              value={this.state.body}
              onChange={this.handleInputChange}
            />
          </div>

          <div className="actions-wrapper">
            <Button basic color="green" content="Send" icon="send" loading={false} />
          </div>
        </Container>
      </div>
    );
  }
}

Compose.propTypes = {
  closeCompose: PropTypes.func.isRequired,
  compose: PropTypes.shape({
    special: PropTypes.shape({
      type: PropTypes.string,
      indexInThread: PropTypes.number,
    }),
  }).isRequired,
  mail: PropTypes.shape({
    thread: PropTypes.array,
  }),
};

Compose.defaultProps = {
  mail: {
    thread: [],
  },
};

const mapStateToProps = state => state;
const mapDispatchToProps = dispatch => bindActionCreators({
  ...composeActions,
}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Compose);
