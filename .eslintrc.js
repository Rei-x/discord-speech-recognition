module.exports = {
  env: {
    commonjs: true,
    es2021: true,
  },
  parser: "@typescript-eslint/parser",
  extends: ["airbnb-typescript/base", "prettier"],
  plugins: ["@typescript-eslint", "prettier", "import"],
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
