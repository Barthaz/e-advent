'use strict';

const path = require('path');

const assetsRoot = path.resolve(__dirname, '../../../assets');
const brandRoot = path.join(assetsRoot, 'brand');
const backgroundsRoot = path.join(assetsRoot, 'backgrounds');

module.exports = {
  assetsRoot,
  brandRoot,
  backgroundsRoot,
  /** @deprecated use eadventLogo */
  background: path.join(assetsRoot, 'background.png'),
  /** @deprecated use eadventLogo */
  logo: path.join(brandRoot, 'eadvent-logo.png'),
  eadventLogo: path.join(brandRoot, 'eadvent-logo.png'),
  eadventMark: path.join(brandRoot, 'eadvent-mark.png'),
  christmasAmbient: {
    landscape: path.join(backgroundsRoot, 'christmas-ambient-landscape.webp'),
    square: path.join(backgroundsRoot, 'christmas-ambient-square.webp'),
    portrait: path.join(backgroundsRoot, 'christmas-ambient-portrait.webp'),
  },
};
