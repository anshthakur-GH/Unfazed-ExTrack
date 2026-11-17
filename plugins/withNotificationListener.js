const { withAndroidManifest, withDangerousMod, withMainApplication } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PACKAGE_PATH = 'com/unfazed/extrack';
const SOURCE_FILES = [
  'UnfazedNotificationListenerService.kt',
  'UnfazedNotificationListenerModule.kt',
  'UnfazedNotificationListenerPackage.kt',
];

function withNotificationListenerManifest(config) {
  return withAndroidManifest(config, (config) => {
    const app = config.modResults.manifest.application[0];
    if (!app.service) app.service = [];

    const alreadyAdded = app.service.some(
      (s) => s['$']['android:name'] === '.UnfazedNotificationListenerService'
    );
    if (!alreadyAdded) {
      app.service.push({
        $: {
          'android:name': '.UnfazedNotificationListenerService',
          'android:exported': 'true',
          'android:label': 'Unfazed EXTrack Transaction Listener',
          'android:permission': 'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'android.service.notification.NotificationListenerService',
                },
              },
            ],
          },
        ],
      });
    }
    return config;
  });
}

function withNotificationListenerSource(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const destDir = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/java',
        PACKAGE_PATH
      );
      fs.mkdirSync(destDir, { recursive: true });
      for (const file of SOURCE_FILES) {
        const src = path.join(__dirname, 'android-src', file);
        fs.copyFileSync(src, path.join(destDir, file));
      }
      return config;
    },
  ]);
}

function withNotificationListenerRegistration(config) {
  return withMainApplication(config, (config) => {
    const contents = config.modResults.contents;
    if (contents.includes('UnfazedNotificationListenerPackage()')) {
      return config;
    }

    // SDK 53+ template: PackageList(this).packages.apply { ... }
    const applyBlock = /(PackageList\(this\)\.packages\.apply\s*\{)/;
    if (applyBlock.test(contents)) {
      config.modResults.contents = contents.replace(
        applyBlock,
        '$1\n          add(UnfazedNotificationListenerPackage())'
      );
      return config;
    }

    // Older template: val packages = PackageList(this).packages ... return packages
    const returnPackages = /(\n\s*)return packages/;
    if (returnPackages.test(contents)) {
      config.modResults.contents = contents.replace(
        returnPackages,
        '$1packages.add(UnfazedNotificationListenerPackage())$1return packages'
      );
      return config;
    }

    throw new Error(
      'withNotificationListener: could not register UnfazedNotificationListenerPackage in MainApplication. ' +
        'The Expo template changed — update plugins/withNotificationListener.js.'
    );
  });
}

module.exports = function withNotificationListener(config) {
  config = withNotificationListenerManifest(config);
  config = withNotificationListenerSource(config);
  config = withNotificationListenerRegistration(config);
  return config;
};
