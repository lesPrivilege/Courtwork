# Courtwork v0.1.2

这一版把 Courtwork 的通用执行底座、垂类包边界与原生可视化构件收成可扩展基线；模型仍只生成，不裁决。

## 本版重点

- Chat 与 Work 继续共用 provider-neutral Turn Engine，并以同源 `ProcessTrace` 呈现 reasoning / progress；两类账本不混写。
- Tauri provider transport 已从 chat orchestration 隔离；产品仍只注册 DeepSeek，底层保持 OpenAI-compatible adapter 边界。
- Legal 与 PM 包采用同一 descriptor / schema / presentation / testing 体例；PM 当前只接通 catalog fixture，不冒充 production live。
- Host renderer 只消费准入后的版本化 ViewModel；未知 template、pointer 或 payload 漂移统一 fail closed，不泄漏 wire/raw JSON。
- 原生 visualization kit 以七类有限 primitives 和 composition 建立复用基线；Legal 与 PM fixture 已验证同一组件源。
- Pages 在 Evidence Line 之外增加合同审查、卷宗阅卷与 PM catalog 三种真实状态，明确区分已验收工作链与尚未接通运行链。

## 下载与校验

- 平台：macOS 12+，Apple Silicon（aarch64）。
- 文件：`Courtwork_0.1.2_aarch64.dmg`
- SHA-256：`f4af2a44248c7d7af970c8486ccaf7c8d72107565c4d824ce9cb8d69578de83d`

## 签名边界

本包为 **ad-hoc 签名、未 Apple 公证的开发构建**。构建机没有 Developer ID identity 或 notarization 凭证；`codesign --verify --deep --strict` 与 `hdiutil verify` 均通过，但 Gatekeeper `spctl` 会以 exit 3 拒绝。首次打开请在 Finder 中右键选择“打开”，或在“系统设置 → 隐私与安全性”确认打开。不要把本包视为 Apple 公证发行包。

安装时打开 DMG，将 `Courtwork.app` 拖入 `Applications`。当前包只支持 Apple Silicon；Intel Mac 不在本版支持范围内。

Courtwork 会犯错；请核对原文与结果。模型只生成，不裁决。
