import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  entry: {
    index: 'src/index.ts',
    types: 'src/types/index.ts',
    validation: 'src/validation/index.ts',
    compatibility: 'src/compatibility/index.ts',
    contracts: 'src/contracts/index.ts',
    registry: 'src/registry/index.ts',
    adapters: 'src/adapters/index.ts',
    environments: 'src/environments/index.ts',
    utils: 'src/utils/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: false, // Temporarily disabled due to Prisma type generation issues
  splitting: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: options.watch ? false : true,
  target: 'es2022',
  outDir: 'dist',
  external: ['react', 'react-dom', './generated/prisma'],
  noExternal: ['semver', 'zod'],
  platform: 'neutral',
  shims: true,
  banner: {
    js: '/* @rubylith/component-registry - Contract-Driven Component Registry */',
  },
  esbuildOptions(options) {
    options.footer = {
      js: '/* Built with tsup */',
    };
  },
}));
