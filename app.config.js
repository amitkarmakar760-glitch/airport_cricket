module.exports = ({ config }) => ({
  ...config,
  name: 'Airport Cricket',
  slug: 'airport-cricket',
  // expo-video needs to be listed here so `expo prebuild` links its native
  // module into the Android project. (Its auto-installer can't write this
  // into a dynamic app.config.js file itself, which is why the build failed
  // with "Cannot automatically write to dynamic config".)
  plugins: [...(config.plugins || []), 'expo-video'],
});
