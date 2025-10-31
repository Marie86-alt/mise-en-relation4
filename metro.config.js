const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Disable watchers to avoid ENOSPC errors in containerized environments
config.watchFolders = [];
config.resetCache = true;

// Reduce watcher load
config.resolver = {
  ...config.resolver,
  sourceExts: [...(config.resolver?.sourceExts || []), 'jsx', 'js', 'ts', 'tsx', 'json'],
};

config.transformer = {
  ...config.transformer,
  // Disable minification for faster builds
  minifierPath: require.resolve('metro-minify-terser'),
};

// Disable file watcher
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Disable watching
      if (req.url.includes('hot-reload')) {
        res.writeHead(204);
        res.end();
        return;
      }
      return middleware(req, res, next);
    };
  },
};

module.exports = config;
