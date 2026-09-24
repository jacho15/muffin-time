import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Allow `const { omitted: _, ...rest } = obj` to drop fields
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
    },
  },
  {
    // Context modules export their Provider next to the hook that reads it.
    // Edits to these files fall back to a full reload instead of fast refresh.
    files: ['src/hooks/useAuth.tsx', 'src/hooks/useFocusTimer.tsx', 'src/hooks/useToast.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
