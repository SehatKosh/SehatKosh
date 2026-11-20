const { withAndroidManifest } = require("@expo/config-plugins");

function withHealthConnect(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults.manifest;

    // 1. Health Connect Permissions
    const healthPermissions = [
      "android.permission.ACTIVITY_RECOGNITION",
      "android.permission.health.READ_STEPS",
      "android.permission.health.READ_HEART_RATE",
      "android.permission.health.READ_OXYGEN_SATURATION",
      "android.permission.health.READ_DISTANCE",
      "android.permission.health.READ_ACTIVE_CALORIES_BURNED",
      "android.permission.health.READ_SLEEP",
      "android.permission.health.READ_BLOOD_PRESSURE",
      "android.permission.health.READ_BLOOD_GLUCOSE",
    ];

    if (!androidManifest["uses-permission"]) {
      androidManifest["uses-permission"] = [];
    }

    const existingPerms = new Set(
      androidManifest["uses-permission"].map((p) => p.$["android:name"])
    );

    for (const perm of healthPermissions) {
      if (!existingPerms.has(perm)) {
        androidManifest["uses-permission"].push({
          $: { "android:name": perm },
        });
      }
    }

    // 2. Package query for Health Connect
    if (!androidManifest.queries) {
      androidManifest.queries = [];
    }
    if (androidManifest.queries.length === 0) {
      androidManifest.queries.push({});
    }
    const queriesObj = androidManifest.queries[0];
    if (!queriesObj.package) {
      queriesObj.package = [];
    }
    const hasHealthPkg = queriesObj.package.some(
      (pkg) => pkg.$?.["android:name"] === "com.google.android.apps.healthdata"
    );
    if (!hasHealthPkg) {
      queriesObj.package.push({
        $: { "android:name": "com.google.android.apps.healthdata" },
      });
    }

    if (!queriesObj.intent) {
      queriesObj.intent = [];
    }
    const hasRationaleQuery = queriesObj.intent.some((item) =>
      item.action?.some(
        (act) =>
          act.$?.["android:name"] ===
          "androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE"
      )
    );
    if (!hasRationaleQuery) {
      queriesObj.intent.push({
        action: [
          {
            $: {
              "android:name":
                "androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE",
            },
          },
        ],
      });
    }

    // 3. Permission rationale intent filter on MainActivity (Legacy <= Android 13)
    const application = androidManifest.application?.[0];
    const mainActivity = application?.activity?.find(
      (a) => a.$?.["android:name"] === ".MainActivity"
    );

    if (mainActivity) {
      if (!mainActivity["intent-filter"]) {
        mainActivity["intent-filter"] = [];
      }
      const hasRationale = mainActivity["intent-filter"].some((filter) =>
        filter.action?.some(
          (act) =>
            act.$?.["android:name"] ===
            "androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE"
        )
      );
      if (!hasRationale) {
        mainActivity["intent-filter"].push({
          action: [
            {
              $: {
                "android:name":
                  "androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE",
              },
            },
          ],
        });
      }
    }

    // 4. Mandatory Android 14/15/16 Activity-Alias
    if (application) {
      if (!application["activity-alias"]) {
        application["activity-alias"] = [];
      }
      const hasAlias = application["activity-alias"].some(
        (alias) => alias.$?.["android:name"] === "ViewPermissionUsageActivity"
      );
      if (!hasAlias) {
        application["activity-alias"].push({
          $: {
            "android:name": "ViewPermissionUsageActivity",
            "android:exported": "true",
            "android:targetActivity": ".MainActivity",
            "android:permission": "android.permission.START_VIEW_PERMISSION_USAGE",
          },
          "intent-filter": [
            {
              action: [
                {
                  $: {
                    "android:name": "android.intent.action.VIEW_PERMISSION_USAGE",
                  },
                },
              ],
              category: [
                {
                  $: {
                    "android:name": "android.intent.category.HEALTH_PERMISSIONS",
                  },
                },
              ],
            },
          ],
        });
      }
    }

    return config;
  });
}

module.exports = withHealthConnect;
