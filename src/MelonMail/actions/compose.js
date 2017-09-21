export const openCompose = special => ({
  type: 'COMPOSE_BOX_OPEN',
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

export const sendRequest = sendingState => ({
  type: 'SEND_REQUEST',
  isSending: true,
  sendingState,
});

export const changeSendState = sendingState => ({
  type: 'SEND_STATE_CHANGE',
  sendingState,
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
