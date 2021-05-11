module.exports = {
  'env': {
    'browser': true,
    'commonjs': true,
    'es2021': true,
  },
  'parser': '@typescript-eslint/parser',
  'extends': [
    'google',
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  'plugins': [
    '@typescript-eslint',
  ],
  'parserOptions': {
    'ecmaVersion': 12,
  },
  'rules': {
    'require-jsdoc': 0,
    'valid-jsdoc': 0,
    'semi': 2,
    'max-len': 0,
    'no-prototype-builtins': 0,
  },
};
