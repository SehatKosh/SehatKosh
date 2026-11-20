#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const targets = [
  path.join(__dirname, '..', 'apps', 'mobile', 'node_modules', '.bin', 'expo.CMD'),
  path.join(__dirname, '..', 'node_modules', '.bin', 'expo.cmd'),
];

for (const cmdPath of targets) {
  if (fs.existsSync(cmdPath)) {
    try {
      let content = fs.readFileSync(cmdPath, 'utf8');
      if (!content.includes('EXPO_CLI_ENTRY')) {
        content = content.replace(
          '@IF EXIST "%~dp0\\node.exe" (',
          '@SET "EXPO_CLI_ENTRY=%~dp0\\..\\expo\\bin\\cli"\r\n@IF NOT EXIST "%EXPO_CLI_ENTRY%" @SET "EXPO_CLI_ENTRY=%~dp0node_modules\\expo\\bin\\cli"\r\n@IF EXIST "%~dp0\\node.exe" ('
        );
        content = content.replace(
          'node  "%~dp0\\..\\expo\\bin\\cli" %*',
          'node  "%EXPO_CLI_ENTRY%" %*'
        );
        content = content.replace(
          '"%~dp0\\node.exe"  "%~dp0\\..\\expo\\bin\\cli" %*',
          '"%~dp0\\node.exe"  "%EXPO_CLI_ENTRY%" %*'
        );
        fs.writeFileSync(cmdPath, content, 'utf8');
        console.log(`[patch-expo-cmd] Patched Windows shim: ${cmdPath}`);
      }
    } catch (_) {
      // Ignore write errors silently in restricted environments
    }
  }
}
