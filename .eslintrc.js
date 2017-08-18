module.exports = {
  extends: 'eslint-config-airbnb',
  plugins: [
    'react', 'import',
  ],
  env: {
    "es6": true,
    "browser": true
  },
  rules: {
    'jsx-a11y/href-no-hash': 'off',
    'no-unused-vars': 1,
    'no-underscore-dangle': 0,
    'global-require': 0,
  },
  globals: {
    window: true,
    document: true,
    web3: true,
    fetch: true,
    localStorage: true,
  },
};
