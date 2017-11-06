import { clearThread } from './mail';

export const openCompose = special => ({
  type: special ? 'COMPOSE_BOX_OPEN_SPECIAL' : 'COMPOSE_BOX_OPEN',
  special,
});

export const closeCompose = () => ({
  type: 'COMPOSE_BOX_CLOSE',
});

export const minimizeCompose = () => ({
  type: 'COMPOSE_BOX_HIDE',
});

export const maximizeCompose = () => ({
  type: 'COMPOSE_BOX_SHOW',
});

export const sendMailTo = (to, title) => (dispatch) => {
  dispatch(clearThread());
  dispatch(openCompose({
    type: 'sendTo',
    to,
    title,
  }));
};

export const sendRequest = sendingState => ({
  type: 'SEND_REQUEST',
  isSending: true,
  sendingState,
});

export const changeSendState = (sendingState, sendingStateNumber) => ({
  type: 'SEND_STATE_CHANGE',
  sendingState,
  sendingStateNumber,
});

export const sendSuccess = () => ({
  type: 'SEND_SUCCESS',
  isSending: false,
});

export const sendError = message => ({
  type: 'SEND_ERROR',
  isSending: false,
  message,
});

export const sendSuccessClear = () => ({
  type: 'SEND_SUCCESS_CLEAR',
});
