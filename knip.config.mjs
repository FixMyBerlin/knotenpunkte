/** @type {import('knip').KnipConfig} */
const strict = process.env.KNIP_STRICT === '1'

export default {
  // main.tsx, vite.config.ts and playwright.config.ts are auto-detected entries.
  entry: [
    'src/routes/**/*.tsx',
    'src/**/*.test.ts',
    'shared/**/*.test.ts',
    'tests/**/*.ts',
    'netzanpassungen/src/routes/**/*.tsx',
    'netzanpassungen/src/**/*.test.ts',
  ],
  // Vendored code keeps its full API: the UI kit (Catalyst) and the key-value client.
  ignore: [
    'shared/components/ui/**',
    'shared/kv-client/**',
    'netzanpassungen/src/routeTree.gen.ts',
  ],
  ignoreDependencies: ['@typescript/typescript-darwin-arm64'],
  rules: {
    files: 'error',
    dependencies: 'error',
    devDependencies: 'error',
    unlisted: 'error',
    binaries: 'error',
    exports: strict ? 'error' : 'warn',
    types: strict ? 'error' : 'warn',
    enumMembers: strict ? 'error' : 'warn',
    duplicates: 'warn',
  },
}
