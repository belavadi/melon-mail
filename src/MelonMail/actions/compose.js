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

export const changeComposeState = sendingState => ({
  type: 'COMPOSE_BOX_CHANGE_STATE',
  sendingState,
});
