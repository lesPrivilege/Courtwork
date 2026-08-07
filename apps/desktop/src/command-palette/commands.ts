import { CHROME_COPY } from '../chrome/copy';
import { containerOriginLabel } from '../case/container-copy';
import { isDemoCaseId } from '../case/case-scope';
import type { CaseSummary } from '../case/types';
import type { SceneStripEntry } from '../workbench/scene-strip';
import type { PaletteCommand } from './CommandPalette';

/**
 * ⌘K 命令面板条目装配（外提自 App.tsx，PACK-INTERACT-1 过手即拆）。
 *
 * 场景条目与场景条同源（GENERIC-PACK-1 裁定二：同一 registry 派生条目，零垂类字面量）；
 * 案件条目含路由律（⌘K 跳案即切 work 面）；行为与 App 内联版本逐字一致。
 */
export interface PaletteCommandsInput {
  sceneEntries: readonly SceneStripEntry[];
  cases: readonly CaseSummary[];
  selectedCase: CaseSummary | undefined;
  focusMode: boolean;
  onLaunchScenario: (entry: SceneStripEntry) => void;
  onSelectCase: (id: string) => void;
  onNewCase: () => void;
  onArchiveTrigger: (id: string) => void;
  onToggleFocus: () => void;
  onOpenOutputFolder: () => void;
  onOpenSettings: () => void;
  close: () => void;
}

export function buildPaletteCommands(input: PaletteCommandsInput): PaletteCommand[] {
  const close = input.close;
  return [
    ...input.sceneEntries.map((entry) => ({
      id: `scene-${entry.scenarioId}`,
      section: 'Scenes',
      label: entry.label,
      onRun: () => { input.onLaunchScenario(entry); close(); },
    })),
    ...input.cases.map((item) => ({
      id: `case-${item.id}`,
      section: 'Cases',
      label: item.archived
        ? `${item.title}（已归档）`
        : item.isDemo || isDemoCaseId(item.id)
          ? `${item.title}（${containerOriginLabel(true)}）`
          : item.title,
      onRun: () => { input.onSelectCase(item.id); close(); },
    })),
    { id: 'action-new-case', section: 'Actions', label: CHROME_COPY.navigation.newCase, onRun: () => { input.onNewCase(); close(); } },
    ...(input.selectedCase ? (() => {
      const selected = input.selectedCase;
      return [{
        id: 'action-archive',
        section: 'Actions',
        label: selected.archived ? '取消归档当前案件' : '归档当前案件',
        onRun: () => { input.onArchiveTrigger(selected.id); close(); },
      } satisfies PaletteCommand];
    })() : []),
    { id: 'action-focus', section: 'Actions', label: input.focusMode ? 'Exit focus mode' : 'Enter focus mode', onRun: () => { input.onToggleFocus(); close(); } },
    { id: 'action-output-folder', section: 'Actions', label: 'Open output folder', onRun: () => { input.onOpenOutputFolder(); close(); } },
    { id: 'action-settings', section: 'Actions', label: 'Settings', onRun: () => input.onOpenSettings() },
  ];
}
