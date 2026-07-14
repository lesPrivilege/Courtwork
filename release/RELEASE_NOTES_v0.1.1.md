# Courtwork v0.1.1

Courtwork 的首个公开 Apple Silicon 开发预览：把卷宗装进案件，把每条结论钉回原文，把最后一个确认留给人。

## 本版重点

- DeepSeek-first 产品面，底层使用 OpenAI-compatible 请求协议；当前不暴露 custom provider 或可编辑 Base URL。
- Chat 正文、推理、usage、失败与取消统一进入 provider-neutral Turn 事件链；正文是真实增量，不再用计时器伪造流式输出。
- 通用交互卡只消费不可变 Turn replay；问题、封闭选项与来源锚点由 legal 垂类 manifest 注入，回答经 core first-wins 记录。
- 原件路由校验 file、文本版本、range 与逐字 quote 后才打开并高亮；未知或漂移来源 fail closed。
- Schema polish、核心品牌标记、Evidence Line 首页与精确 anti-slop 门禁已完成独立验收。

## 下载与校验

- 平台：macOS 12+，Apple Silicon（aarch64）。
- 文件：`Courtwork_0.1.1_aarch64.dmg`
- SHA-256：`37792b767fe08119edab3cc6b793e59cd4511758110f8b42e6242e80a023db7e`

## 签名边界

本包为 **ad-hoc 签名、未 Apple 公证的开发构建**。构建机没有 Developer ID identity 或 notarization 凭证；`codesign --verify --deep --strict` 与 `hdiutil verify` 均通过，但 Gatekeeper `spctl` 会拒绝。首次打开请在 Finder 中右键选择“打开”，或在“系统设置 → 隐私与安全性”确认打开。不要把本包视为 Apple 公证发行包。

安装时打开 DMG，将 `Courtwork.app` 拖入 `Applications`。当前包只支持 Apple Silicon；Intel Mac 不在本版支持范围内。

Courtwork 会犯错；请核对原文与结果。模型只生成，不裁决。
