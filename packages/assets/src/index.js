'use strict';

const path = require('path');

const assetsRoot = path.resolve(__dirname, '../../../assets');

module.exports = {
  assetsRoot,
  background: path.join(assetsRoot, 'background.png'),
  logo: path.join(assetsRoot, 'logo.png'),
};
