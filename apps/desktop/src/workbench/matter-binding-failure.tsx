/**
 * 绑定失效显式面板（PACK-INTERACT-1 ③，ADR-015 决定三 fail-closed 显式）。
 *
 * matter 的持久绑定指向本制品未准入的包时（如旧构建删包后旧档仍绑），生效 registry 已由
 * `resolveMatterRegistries` 落零垂类（fail-closed，零入口零词表）；本面板把「发生了什么＋
 * 下一步」显式说出来（核心不变量四），下一步＝管理此案的包（换绑或清绑）。
 */
export function MatterBindingFailure({ packageId, onManage }: { packageId: string; onManage: () => void }) {
  return (
    <section className="binding-failure" role="alert" data-testid="matter-binding-failure">
      <p>
        此案绑定的「{packageId}」包在当前版本不可用 · 请管理此案的包以更换或取消加载
      </p>
      <button type="button" className="quiet-button" data-testid="matter-binding-failure-manage" onClick={onManage}>
        管理此案的包
      </button>
    </section>
  );
}
