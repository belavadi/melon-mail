export const executeWhenReady = (f) => {
  if (document.readyState === 'complete') {
    f();
  } else {
    window.addEventListener('load', () => { f(); });
  }
};

export const formatDate = (inputDate) => {
  const date = new Date(inputDate);

  return `${date.getDate()}. ${date.getMonth() + 1}. ${date.getFullYear()}. 
    ${`0${date.getHours()}`.slice(-2)}:${`0${date.getMinutes()}`.slice(-2)}`;
};
