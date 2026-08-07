import type { ContainerKind } from './container-copy';
import type { UnfiledSession } from '../rail/types';
import type { ContainerizeRequest } from '../composer';

/**
 * 容器化仪式处理器（外提自 App.tsx，PACK-INTERACT-1 过手即拆）。
 *
 * docs/design/principles.md：composer-first 容器化仪式——用户选名词（案件/工作区），
 * 系统不替用户选。两个入口共享同一枚 `containerizationTitle`（日期派生标题）。
 */
export function useContainerization(input: {
  createCase: (opts: { title: string; kind: ContainerKind }) => string;
  unfiledSessions: readonly UnfiledSession[];
  setUnfiledSessions: (updater: (current: UnfiledSession[]) => UnfiledSession[]) => void;
  containerizeUnfiledId: string | null;
  setContainerizeUnfiledId: (id: string | null) => void;
}) {
  const containerizationTitle = (kind: ContainerKind) =>
    kind === 'workspace'
      ? `项目 · ${new Date().toLocaleDateString('zh-CN')}`
      : `案件 · ${new Date().toLocaleDateString('zh-CN')}`;

  const handleContainerize = (request: ContainerizeRequest) => {
    input.createCase({ title: containerizationTitle(request.kind), kind: request.kind });
  };

  /**
   * F-1.1：未归档「存入」→ 容器化仪式（与 composer-first 同族）。
   * 禁止直建 kind:'case'（docs/decisions/ADR-006-ui-host.md：用户选名词，不替用户选）。
   */
  const confirmContainerizeUnfiled = (kind: ContainerKind) => {
    if (!input.containerizeUnfiledId) return;
    const row = input.unfiledSessions.find((item) => item.id === input.containerizeUnfiledId);
    const fallback = containerizationTitle(kind);
    const title = row?.title?.trim() || fallback;
    input.createCase({ title, kind });
    input.setUnfiledSessions((current) => current.filter((item) => item.id !== input.containerizeUnfiledId));
    input.setContainerizeUnfiledId(null);
  };

  return { handleContainerize, confirmContainerizeUnfiled };
}
