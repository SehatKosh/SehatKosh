const {
  withAndroidManifest,
  withDangerousMod,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

function withCleartextTraffic(config) {
  // 1. Modify AndroidManifest.xml
  config = withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults.manifest;
    const mainApplication = androidManifest.application?.[0];
    if (mainApplication) {
      mainApplication.$["android:usesCleartextTraffic"] = "true";
      mainApplication.$["android:networkSecurityConfig"] =
        "@xml/network_security_config";
    }

    // Add necessary network permissions
    const permissions = [
      "android.permission.INTERNET",
      "android.permission.ACCESS_NETWORK_STATE",
      "android.permission.ACCESS_WIFI_STATE",
    ];

    if (!androidManifest["uses-permission"]) {
      androidManifest["uses-permission"] = [];
    }

    const existing = new Set(
      androidManifest["uses-permission"].map((p) => p.$["android:name"])
    );

    for (const perm of permissions) {
      if (!existing.has(perm)) {
        androidManifest["uses-permission"].push({
          $: { "android:name": perm },
        });
      }
    }

    return config;
  });

  // 2. Write network_security_config.xml into res/xml/
  config = withDangerousMod(config, [
    "android",
    async (config) => {
      const resXmlDir = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "res",
        "xml"
      );
      if (!fs.existsSync(resXmlDir)) {
        fs.mkdirSync(resXmlDir, { recursive: true });
      }

      const xmlPath = path.join(resXmlDir, "network_security_config.xml");
      const xmlContent = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
            <certificates src="user" />
        </trust-anchors>
    </base-config>
</network-security-config>
`;
      fs.writeFileSync(xmlPath, xmlContent, "utf-8");
      return config;
    },
  ]);

  return config;
}

module.exports = withCleartextTraffic;
