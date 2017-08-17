const executeWhenReady = (f) => {
  if (document.readyState === 'complete') {
    f();
  } else {
    window.addEventListener('load', () => { f(); });
  }
};

export default {
  executeWhenReady,
};
