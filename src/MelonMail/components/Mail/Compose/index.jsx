import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { Container, Button } from 'semantic-ui-react';
import * as composeActions from '../../../actions/compose';

class Compose extends Component {
  constructor(props) {
    super(props);

    this.state = {};
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
            <input type="text" placeholder="To" />
            <input type="text" placeholder="Title" />
            <textarea name="" placeholder="Content" />
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
};

const mapStateToProps = state => state;
const mapDispatchToProps = dispatch => bindActionCreators({
  ...composeActions,
}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Compose);
