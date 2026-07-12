import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // docs/** 为设计稿与文档资产（含浏览器端 support.js 演示件），非产品代码面，不进 lint。
    ignores: ['**/dist/**', '**/node_modules/**', '**/json-schema/**', '**/spike/**', '**/target/**', '**/playwright-report/**', '**/test-results/**', 'docs/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // 门禁/截图脚本是 Node 运行面：补 node 全局声明。
    // 2026-07-12 FABLE-BASE 假绿清账：lint 此前从未整仓真绿——历史验证跑法 `pnpm lint | tail` 让管道尾命令吃掉退出码。
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
);
