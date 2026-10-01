const fs = require('fs');

// Push notifications need google-services.json (from the Firebase console, free).
// It is only used when the file exists in the repo, so builds keep working without it.
const googleServices = fs.existsSync('./google-services.json') ? './google-services.json' : undefined;

module.exports = ({ config }) => ({
  ...config,
  name: 'Airport Cricket Team',
  slug: 'airport-cricket',
  android: {
    ...(config.android || {}),
    ...(googleServices ? { googleServicesFile: googleServices } : {}),
  },
  // Expo project id (from expo.dev, free). Stored as the GitHub secret EXPO_PROJECT_ID.
  extra: {
    ...(config.extra || {}),
    eas: { projectId: process.env.EXPO_PROJECT_ID || undefined },
  },
  // expo-video and expo-notifications must be listed here so `expo prebuild`
  // links their native modules into the Android project.
  plugins: [
    ...(config.plugins || []),
    'expo-video',
    ['expo-notifications', { icon: './assets/android-icon-monochrome.png', color: '#B4500F' }],
  ],
});
