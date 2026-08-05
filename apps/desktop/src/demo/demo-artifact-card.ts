import type { CitationStats } from '@courtwork/core';
import type { PartyGraph, RiskList, Timeline } from '@courtwork/legal';
import type { ScenarioFlow } from '../protocol/client';

export interface DemoArtifactCardCopy {
  title: string;
  summary: string;
}

/**
 * 样板案 chat 侧 artifact 卡的取数与文案（GENERIC-PACK-1 外提物）。
 *
 * 原先住 App.tsx，为此在壳里长期持有 `legal.Timeline` / `legal.PartyGraph` / `legal.RiskList`
 * 三个局部与其垂类类型——而这张卡**只属显式 demo 回放**（`flow` 是 demo 场景相位）。
 * 迁到 demo 族后，壳侧不再因一张样板卡而认识任一垂类 artifact type。
 *
 * 计数仍由投影派生（LEGAL-DEMO-RUN ③：事件里是多少就呈现多少），`citationStats` 仅事件携带，
 * 缺席即整段省略，不给观测字段造兜底值。
 */
export function demoArtifactCardCopy(
  flow: ScenarioFlow | null,
  artifactPayload: (artifactType: string) => unknown,
  citationStats: CitationStats | undefined,
): DemoArtifactCardCopy {
  if (flow === 'S3') {
    const riskCount = (artifactPayload('legal.RiskList') as RiskList | undefined)?.risks.length ?? 0;
    return {
      title: `发现 ${riskCount} 项合同风险`,
      summary: `${riskCount} 项 · 打开修订预览${
        citationStats ? ` · 引语公证 ${citationStats.resolvedAfterRetry}/${citationStats.claims}` : ''
      }`,
    };
  }
  const eventCount = (artifactPayload('legal.Timeline') as Timeline | undefined)?.events.length ?? 0;
  const partyCount = (artifactPayload('legal.PartyGraph') as PartyGraph | undefined)?.nodes.length ?? 0;
  return {
    title: '时间线与关系图谱已生成',
    summary: `${eventCount} 个事件 · ${partyCount} 个主体 · 打开时间线`,
  };
}
