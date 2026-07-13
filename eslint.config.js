import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // 文档、归档与生成物不属于产品代码 lint 面。
    ignores: ['**/dist/**', '**/node_modules/**', '**/json-schema/**', '**/spike/**', '**/target/**', '**/playwright-report/**', '**/test-results/**', 'docs/**', 'archive/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // 门禁/截图脚本是 Node 运行面：补 node 全局声明。
    files: ['**/scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        URL: 'readonly',
        Buffer: 'readonly',
        fetch: 'readonly',
        AbortController: 'readonly',
        TextDecoder: 'readonly',
      },
    },
  },
  {
    // 截图脚本中的 page.evaluate 回调在浏览器上下文执行。
    files: ['apps/desktop/scripts/capture-finale-audit.mjs'],
    languageOptions: {
      globals: {
        document: 'readonly',
        localStorage: 'readonly',
        window: 'readonly',
      },
    },
  },
  {
    files: ['site/**/*.js'],
    languageOptions: {
      globals: {
        document: 'readonly',
        IntersectionObserver: 'readonly',
        window: 'readonly',
      },
    },
  },
);
