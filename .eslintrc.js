module.exports = {
  parser: '@typescript-eslint/parser', // Specifies the ESLint parser
  plugins: ['prettier'],
  extends: [
    'plugin:@typescript-eslint/recommended', // Uses the recommended rules from the @typescript-eslint/eslint-plugin,
    'plugin:prettier/recommended',
  ],
  parserOptions: {
    ecmaVersion: 'latest', // Allows for the parsing of modern ECMAScript features
    sourceType: 'module', // Allows for the use of imports
    files: ['*.tsx', '**/*.ts', '*.d.ts', 'src/index.ts'],
    exclude: ['*.js', 'lib/', '**/*.js', 'webpack.config.js'],
  },
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    'no-var': 'error',
    'prefer-const': 'error',
    'no-duplicate-imports': 0,
    'comma-dangle': [2, 'always-multiline'],
    strict: [2, 'global'],
  },
  settings: {},
  overrides: [
    {
      files: ['__tests__/*.ts'],
      env: {
        jest: true,
      },
    },
  ],
}
