export const push = path => ({
  type: 'ROUTE_CHANGE',
  path,
});

export const reset = () => ({
  type: 'ROUTE_RESET',
});
