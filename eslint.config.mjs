import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    // type-aware strict linting for everything covered by the tsconfigs
    files: ['src/**/*.ts', 'test/**/*.ts'],
    ignores: ['test/e2e/**'],
    extends: [tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // The ValueBag is `any` by design (untyped flows are a supported public contract),
      // so the no-unsafe-* family would flag nearly every interaction with a bag.
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true, allowAny: true }],
      '@typescript-eslint/restrict-plus-operands': ['error', { allowAny: true }],
      // overload implementation signatures must keep the loosely typed Caminho return:
      // `this` is not compatible with the typed Caminho<...> each overload returns
      '@typescript-eslint/prefer-return-this-type': 'off',
    },
  },
  {
    files: ['test/**/*.ts'],
    rules: {
      // mocks implement async interfaces without awaiting anything,
      // and jest matchers like expect(mock.fn) trip unbound-method
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  {
    rules: {
      semi: ['error', 'never'],
      'no-console': 'error',
      'max-len': ['error', { code: 120 }],
      'no-param-reassign': ['error', { props: true, ignorePropertyModificationsFor: ['valueBag'] }],
      'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
      'object-curly-newline': ['error', { multiline: true, consistent: true }],
      complexity: ['error', { max: 4 }],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      'quote-props': ['error', 'as-needed'],
      indent: ['error', 2],
      quotes: ['error', 'single', { avoidEscape: true }],
      'comma-dangle': ['error', 'always-multiline'],
    },
  },
  {
    files: ['benchmark/**/*'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['test/e2e/**/*'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        require: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
)
