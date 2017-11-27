const express = require('express');
const path = require('path');
const listener = require('./ethereum-listener.js');

const app = express();

app.use(express.static(__dirname));

app.listen(3000, () => {
  console.log('Notification listener listening on port 3000!');
});