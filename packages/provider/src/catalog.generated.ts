// Generated from catalog/deepseek.json by scripts/generate-catalog.mjs. Do not edit.
export const DEEPSEEK_CATALOG = {
  "id": "deepseek",
  "label": "DeepSeek",
  "baseUrl": "https://api.deepseek.com/v1",
  "models": [
    "deepseek-v4-flash",
    "deepseek-v4-pro"
  ],
  "paths": {
    "chat": "/chat/completions",
    "models": "/models"
  }
} as const;
