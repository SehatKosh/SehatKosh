const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");
const { FileStore } = require("metro-cache");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// ─── Watch the entire monorepo so Metro can follow pnpm symlinks ──────────────
// (inotify limit has been raised to 524288 to support this)
config.watchFolders = [monorepoRoot];

// ─── Resolve node_modules from app first, then monorepo root ─────────────────
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// ─── Workspace packages expose raw .ts files ─────────────────────────────────
config.resolver.sourceExts = [
  "tsx",
  "ts",
  "jsx",
  "js",
  "json",
  "cjs",
  "mjs",
];

// ─── Disable package exports (fixes pnpm symlink resolution) ─────────────────
config.resolver.unstable_enablePackageExports = false;

// ─── Store cache inside the project (avoids stale monorepo-root cache) ───────
config.cacheStores = [
  new FileStore({ root: path.join(projectRoot, ".metro-cache") }),
];

module.exports = withNativeWind(config, { input: "./global.css" });



