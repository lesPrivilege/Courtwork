# 兼容迁移与施工顺序

## 现有冲突

当前 `styles.css` 的 `--attention-review: var(--accent-ink)` 让 custom/gray-steel 的 review 随 skin；默认 slate 另覆写为固定 review foreground。旧 custom 还可替换 danger/success 与 alpha，范围比新规范宽。**本单只冻结整改合同，未改运行时行为。**

## Astra 迁移裁决（以下新增行为均待实施）

不创建 review skin API，不把旧 accent/danger 推断成用户选中的 review hue。Review 值只属于语义层，由 scheme/高对比适配。第一片去除 review→accent 依赖，并保持 skin neutral 面的既有选择。

保存的数据与生效投影分开：旧 `skin/customSkin` 原始存储不删除、不自动重写；新版本的 resolver 只在外观许可域应用旧值，固定语义域使用系统角色。受忽略的旧键需在编辑/预览中明确列出，不能继续显示成“全部已应用”。提供原始值导出与显式移除；reset 生效选择不等于删除存着的 token 集。不得以复位为名清空用户自定义；用户显式Remove仍可按现有语义清空customSkin。

新 skin 格式若引入，版本化其许可键而非复用旧全量 allowlist：neutral/paper/获准外观色；拒绝 review、danger、success、focus、材质数值与未知键。首帧与模块必须共享相同有效规则（或同源生成），避免 reload 闪错色。拟保留/待实现的legacy parser读取原始格式用于读取与导出，不代表旧值继续能控制固定层。此resolver、导出/忽略键说明、共享解析尚不存在，必须在SK-2实施并验证。无需runtime schema或个人数据迁移。

固定review与custom背景的对比警告尚未实施（当前只检基础19对）。整改要求：固定 review 遇到低对比 custom 背景：先展示实际组合的对比警告，保留非颜色标签；不改变 review 色或静默删值。预置 skin 必须通过全部固定语义对比门槛才能发货。自定义是否继续允许低对比沿既有警告政策；不为本单自行改为阻止保存。此限制必须在证据中可见。

## 切片

| 片 | 范围 / owner | 完成证据 |
|---|---|---|
| SK-1 固定 Review | Astra 明确 role 与兼容合同；前端单 writer 去除 custom/steel accent 回退，核对所有 needs_you 消费点 | 换 skin 前后 review computed color 相同；浅深/system各自稳定；普通交互仍沿自身roles |
| SK-2 Skin 边界与兼容 | 偏好 owner 实施有效投影、旧值留存/导出/警告、first paint、preset准入 | 非法/未知键拒绝；旧存储原样；未应用/已应用 provenance 正确；固定语义不随皮肤 |
| SK-3 Dystopia preset | 前端单 writer，仅 neutral/外观变化，review固定 | 同内容浅深/窄屏对照；固定review/danger/focus在全部底面可读；默认slate保持 |
| SK-4 Review consumers / material | 有事实才接语义槽；材质仍服从 FE-05 前置 | 状态转换去色、灰度可辨、无新泛化accent；不得合入skin包 |
| SK-5 Pages A/B/C | 发布面owner，独立namespace | 不改截图，不污染app，响应式与回退对照；A为已有状态 |

现有前端单writer队列继续有效，不能因本规范直接抢写共享styles/composer。作者与独立复核分列；Astra实现的部分仍需非作者核对。

## 必测反例

1. skin载入review/foreground、danger、success、focus、alpha等键不能改变新许可域之外的computed角色；仅仅parser拒绝还不够，需覆盖first-paint路径。
2. 切换slate/custom/未来dystopia后，相同scheme的review颜色不变，danger/focus也不被skin染色；背景变化仍须重算对比。
3. 状态unknown/resolved、旧revision与加载失败不能虚构needs_you；颜色不能修饰错误事实。
4. 全套旧token保存但未Apply时不得显示为生效；忽略的旧键有解释，原始值能导出，reset不删值。
5. 新material consumer仍须登记与fallback；token存在不扩大blur名额。

运行相关prefs/first-frame/appearance/contrast/color/material检查；UI变更补目标场景与相邻先例的浏览器回归。此处是未来交付条件，本单不声称通过了未执行的产品测试。
