/**
 * WORK-TURN-1 G：caseId 铸号去标题化。
 *
 * 根因（真机第三轮 G 项，复核坐实）：旧铸号 `case-${Date.now()}-${title}` 把标题原文拼进
 * caseId；`work_state.rs safe_token` 只认 ASCII 字母数字与 `-_.`（路径穿越红线，不得放宽），
 * 中文标题案首次 work_state commit 即 InvalidRef——场景打开顶部红条。
 *
 * 修法：铸号只出安全 token（UUID），标题只作展示字段（持久 `title` 已由 CASE-PERSIST-1 承载）。
 * `WORK_SAFE_CASE_ID_RE` 是 Rust `safe_token` 的**只读镜像**（parity mirror）：TS 侧仅用于
 * 铸号自证与存量案守卫，形状强制仍在 Rust 侧；两处如漂移以 Rust 为准。
 */
export const WORK_SAFE_CASE_ID_RE = /^(?!\.$)(?!\.\.$)(?!.*\.\.)[A-Za-z0-9._-]{1,128}$/;

export function mintCaseId(): string {
  return `case-${crypto.randomUUID()}`;
}

/** 存量案守卫：旧版 ASCII 标题 id 天然安全（零迁移成本）；携非 ASCII 的旧 id 原位容忍、场景前显式引导。 */
export function isWorkSafeCaseId(id: string): boolean {
  return WORK_SAFE_CASE_ID_RE.test(id);
}

/**
 * 存量非安全 id 案的场景引导文案（voice：发生了什么+下一步；零技术措辞——错误语义保留，
 * 「状态引用非法」的技术表述不出现）。迁移评估结论＝原位容忍：材料记录/宿主授权/恢复指针
 * 跨层按 caseId 键控（部分在 src-tauri 侧），重写号需跨层迁移且本单零触碰 Rust——收益不抵风险。
 */
export const LEGACY_CASE_SCENARIO_COPY = '此案为旧版编号，暂不能运行场景 · 新建案件并重新入库材料后即可继续';
