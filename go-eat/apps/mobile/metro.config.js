// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/**
 * This codebase's TypeScript source consistently writes relative imports with an explicit `.js`
 * extension (e.g. `import { useTheme } from '../src/theme/index.js'`) against actual `.ts`
 * files. TypeScript accepts this under `moduleResolution: "Bundler"` (see tsconfig.base.json),
 * but Metro's resolver treats extensions literally and fails to find the `.ts` source. Fall back
 * to `.ts`/`.tsx` when a `.js`/`.jsx` specifier doesn't resolve directly, rather than rewriting
 * every import across the codebase.
 */
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (/\.jsx?$/.test(moduleName)) {
    try {
      return context.resolveRequest(context, moduleName, platform);
    } catch (error) {
      for (const ext of ['.ts', '.tsx']) {
        const candidate = moduleName.replace(/\.jsx?$/, ext);
        try {
          return context.resolveRequest(context, candidate, platform);
        } catch {
          // try the next extension
        }
      }
      throw error;
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
