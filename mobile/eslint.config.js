// The app's own lint setup (Expo's recommended config). It also stops
// ESLint from walking up to the website's config, which ignores mobile/.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/*', '.expo/*'] },
]);
