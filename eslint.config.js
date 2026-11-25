import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  {
    // These files export a component together with its variants / column definitions / helper maps by design
    // (shadcn variants, DataTable column factories, status badge maps). Fast refresh just reloads the page for
    // them, so the "only export components" rule is not useful there.
    files: ['src/components/ui/**', 'src/components/common/StatusBadge.jsx', 'src/pages/**/*Columns.jsx', 'src/pages/**/*Visuals.jsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
]
