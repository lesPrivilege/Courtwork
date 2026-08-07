/**
 * 垂类产物在包未加载时的显式退化视图（ADR-015 决定四）。
 *
 * matter 的 journal/产物/确认账本是宿主资产，不随包走——已有垂类产物的 matter 在包未加载时
 * 仍可回看其存在，但结构化视图需要包的 schema/blueprint。本视图诚实呈现：不静默降级成
 * 「没有产物」，也不伪装通用产物；显式提示「加载 X 包以获得结构化视图」，重新加载即恢复
 * 结构化视图（零迁移、零重算）。
 *
 * PACK-INTERACT-1 ②：包名取宿主目录 `displayName`（`packageLabel`），不再透出 packageId。
 */
export function VerticalArtifactUnloadedView({
  title,
  packageLabel,
}: {
  /** 产物名（artifact descriptor 的 title——产物自己的身份，不是垂类词表泄漏）。 */
  title: string;
  /** 生成该产物的包的用户可见名（宿主目录取词；生成方由全局 registry 的 artifact 条目给出）。 */
  packageLabel: string;
}) {
  return (
    <section className="artifact-incompatible" data-testid="vertical-artifact-unloaded" role="status">
      <h3>{title}</h3>
      <p data-testid="vertical-artifact-unloaded-hint">
        该产出由{packageLabel}生成 · 加载{packageLabel}以获得结构化视图
      </p>
    </section>
  );
}
