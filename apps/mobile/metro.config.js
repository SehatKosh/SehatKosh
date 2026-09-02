const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// ─── Monorepo: watch all packages ────────────────────────────────────────────
config.watchFolders = [monorepoRoot];

// ─── Monorepo: resolve node_modules from both roots ──────────────────────────
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// ─── Workspace packages expose raw .ts files – tell Metro to handle them ─────
config.resolver.sourceExts = [
  "tsx",
  "ts",
  "jsx",
  "js",
  "json",
  "cjs",
  "mjs",
];

// ─── Disable package exports to avoid symlink/workspace resolution issues ────
config.resolver.unstable_enablePackageExports = false;

module.exports = withNativeWind(config, { input: "./global.css" });

