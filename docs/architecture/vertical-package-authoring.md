# 垂类包开工手册

状态：现行。跨层语义以 ADR-001、ADR-008、ADR-009、ADR-011 与 ADR-012 为准。

## 一、新包最小交付

一个新垂类只有同时交付以下内容，才算进入 Courtwork：

1. `packages/<packageId>` 与 `@courtwork/<packageId>` 一致的包身份；
2. 纯 JSON、可深冻结、可稳定 hash 的 descriptor；
3. 以逻辑 schemaId 为 key 的 Zod bindings 与 Draft 2020-12 导出；
4. artifact 的词表、来源职权、rehydration projection 与版本化 uiTemplateId；
5. Legal 与该包同次装载的 conformance 反例；
6. 包内 SPEC、独立 ACCEPTANCE 与可复现 fixture。

没有真实执行链时，`scenarios=[]`、`promptSegments=[]`。catalog-only 是合法状态；空 prompt、空进度和伪场景不是。

## 二、命名与导出

- package id：小写单词或短横线；目录、npm scope 后缀和 `identity.packageId` 同字节。
- artifact/schema：`<packageId>.<PascalCase>`；schema 文件 kebab-case。
- scenario：`<packageId>.S<number>`；interaction/template/tool id 新增时必须 namespaced。
- blueprint：`courtwork.<shape>.v<number>`；新包不得复制 Legal 的旧 `*-panel` 命名。
- package release version 与 `package.json.version` 一致；持久 payload 改变才评估 `schemaVersion`。
- 根出口 browser-safe；fixture 只从 `/testing`，企业 SDK/编排只从真实 `/runtime` 出口。

## 三、字段与来源开工顺序

每个模型可写 artifact 依次回答：

1. 哪些字段由模型提案、系统计算、人类裁决；
2. 哪些判断必须有来源，模型只能提供什么 quote/claim；
3. final artifact 中的 SourceAnchor 由哪个 system producer 铸造；
4. draft schema 与 citation binding 是否闭合；
5. partial、out-of-coverage、失败和重试如何显式呈现；
6. 哪个 blueprint 能让人看到、修正并确认全部承重字段。

缺任一答案时，不得先写 scenario 或 UI 特判。

## 四、企业能力

只有真实接口、授权方式和宿主运输边界确定后，才建立 `src/runtime/`：

- 垂类 runtime 拥有领域 port、厂商 adapter 和编排；
- composition root 注入受控 transport、credential reference 与 container scope；
- core 只接通用 Tool/Turn/Work port，不认识厂商；
- descriptor、事件和 prompt 不保存 secret、endpoint 或 SDK 对象；
- 厂商返回先转为本垂类 draft/claim，再走通用 schema、锚点和确认门。

## 五、UI 与样板

先从 `docs/design/visualization-kit.md` 选择结构族，再选择现有版本化 blueprint。图片只帮助判断形态；真正接入只认 descriptor、presentation schema 与宿主 registry。

如果现有 blueprint 不够，先用真实 fixture 写 projection/ViewModel、失败形状和交互验收，再新增 blueprint。不得把自由布局 DSL 塞入通用 `presentation.fields`，也不得在 desktop 按 typeId 写领域 switch。

## 六、共享门

- descriptor 可序列化、深冻结、namespace/引用闭合；
- schema 导出全集、URN、Draft、remote-ref 与 drift；
- 字段词表零 wire、pointer 与 renderer fail closed；
- 模型伪造 SourceAnchor、确认绕过、非法/重复回答与坏包隔离；
- 根出口无 fixture/Node/vendor 泄漏；稳定 browser 出口同时通过递归源码依赖门与真实 browser bundler consumer，字符串扫描只能作前置防线，不能单独宣称 browser-safe；
- `pnpm -r build`、`pnpm lint`、`pnpm test`，行为变更另跑独立端口完整 Playwright。
