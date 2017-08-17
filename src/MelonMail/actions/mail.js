export const mailRequest = () => ({
  type: 'MAIL_REQUEST',
});

export const mailSuccess = thread => ({
  type: 'MAIL_SUCCESS',
  thread,
});

export const mailError = error => ({
  type: 'MAIL_ERROR',
  error,
});

export const fetchMail = id => (dispatch) => {
  dispatch(mailRequest());

  // fetch mail
  const thread = [{
    id,
    title: 'Test title',
    from: 'user@mail.com',
    date: '12-03-2017',
  }];
  setTimeout(() => {
    dispatch(mailSuccess(thread));
  }, 300);
};
