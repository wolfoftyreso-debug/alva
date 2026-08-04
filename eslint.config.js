import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // felsokning/ är en egen produkt med egen verktygskedja: egen
    // eslint-konfiguration, egna prettier-regler och egen CI i
    // .gitea/workflows/. Den här konfigurationen gäller Semantika.
    ignores: [
      '**/node_modules/',
      '**/dist/',
      '**/build/',
      '**/.expo/',
      '**/cdk.out/',
      'felsokning/',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },
);
