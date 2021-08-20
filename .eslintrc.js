module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
  },
  parser: "@typescript-eslint/parser",
  extends: [
    "airbnb-typescript/base",
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  plugins: ["@typescript-eslint", "prettier"],
  parserOptions: {
    ecmaVersion: 12,
    project: "./tsconfig.json",
  },
  rules: {
    "require-jsdoc": 0,
    "valid-jsdoc": 0,
    "prettier/prettier": "error",
    semi: 2,
    "max-len": 0,
    "no-prototype-builtins": 0,
    "@typescript-eslint/no-unused-expressions": 0,
    "class-methods-use-this": 0,
    "no-non-null-assertion": 0,
  },
};
