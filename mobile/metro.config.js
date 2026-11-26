// The app shares pure modules with the website (demo personas, the Brain's
// composers, volatility, Saudi reference data, the tool registry,
// dictionaries) straight from ../src/lib, so both surfaces read one source
// of truth. Metro only bundles files inside its watched folders, so that
// directory is added here; the `@shared/*` alias lives in tsconfig.json.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, '../src/lib')];

module.exports = config;
