/**
 * Webpack configuration overrides for react-scripts
 * 
 * This file is used to suppress expected warnings about dynamic imports
 * in the extension loader, which are required for runtime extension loading.
 */

module.exports = function override(config, env) {
  // Suppress "Critical dependency" warnings for dynamic imports
  // These are expected and safe for runtime extension loading
  config.ignoreWarnings = [
    ...(config.ignoreWarnings || []),
    {
      module: /ExtensionsLoader\.ts$/,
      message: /Critical dependency: the request of a dependency is an expression/,
    },
  ];

  return config;
};

