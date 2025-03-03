import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
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
)
