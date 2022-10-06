module.exports = {
  extends: [
    'eslint:recommended',
  ],
  env: {
    browser: true,
    node: true,
  },
  root: true,
  ignorePatterns: [
    ".*",
    "lib/**/*",
  ],
  parserOptions: {
    sourceType: "module",
    ecmaVersion: 2020
  },
  overrides: [
    {
      files: ["**/*.ts"],
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
      ],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: ['./tsconfig.lint.json'],
      },
      plugins: ['@typescript-eslint']
    }
  ]
};