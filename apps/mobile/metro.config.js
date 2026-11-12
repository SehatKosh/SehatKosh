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

// ─── Custom module resolution hook for Expo SDK 58 & monorepo compatibility ───
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "@expo/log-box/LogBox") {
    try {
      return context.resolveRequest(context, "@expo/log-box/build/LogBox", platform);
    } catch (e) {
      // Fallback to original resolver if build path fails
    }
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

// ─── Store cache inside the project (avoids stale monorepo-root cache) ───────
config.cacheStores = [
  new FileStore({ root: path.join(projectRoot, ".metro-cache") }),
];

module.exports = withNativeWind(config, {
  input: path.resolve(projectRoot, "global.css"),
  projectRoot: projectRoot,
  configPath: path.resolve(projectRoot, "tailwind.config.js"),
});



